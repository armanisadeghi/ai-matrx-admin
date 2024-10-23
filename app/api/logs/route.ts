// app/api/logs/route.ts
// STATUS: NEW FILE
import { NextResponse } from 'next/server';
import { LogEntry } from '@/lib/logger/types';
import { logConfig } from '@/lib/logger/config';

export async function POST(request: Request) {
    try {
        const { logs } = await request.json() as { logs: LogEntry[] };

        // Send to Datadog if enabled
        if (logConfig.datadog.enabled && logConfig.datadog.apiKey) {
            await fetch(`https://http-intake.logs.${logConfig.datadog.site}/api/v2/logs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'DD-API-KEY': logConfig.datadog.apiKey
                },
                body: JSON.stringify(logs.map(log => ({
                    ...log,
                    ddsource: 'nodejs',
                    service: logConfig.service,
                    ddtags: `env:${logConfig.environment}`
                })))
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error processing logs:', error);
        return NextResponse.json(
            { error: 'Failed to process logs' },
            { status: 500 }
        );
    }
}
