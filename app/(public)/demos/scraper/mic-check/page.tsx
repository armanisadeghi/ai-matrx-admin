"use client";

import React, { useState, useCallback } from "react";
import { Mic, Loader2, CheckCircle, Clock, Server, Wifi, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoPageLayout } from "../_components/DemoPageLayout";
import { ResponseViewer } from "../_components/ResponseViewer";

interface MicCheckResponse {
    status?: string;
    message?: string;
    timestamp?: string;
    service?: string;
    sample_data?: unknown;
    [key: string]: unknown;
}

// Rendered content component for mic check
function RenderedContent({ data }: { data: MicCheckResponse }) {
    const isSuccess = data?.status === 'success' || data?.status === 'ok';
    
    return (
        <div className="p-6">
            <div className="max-w-xl mx-auto">
                {/* Status Badge */}
                <div className="flex items-center justify-center mb-8">
                    <div className={`p-4 rounded-full ${
                        isSuccess 
                            ? 'bg-green-100 dark:bg-green-900/30' 
                            : 'bg-amber-100 dark:bg-amber-900/30'
                    }`}>
                        {isSuccess ? (
                            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                        ) : (
                            <AlertCircle className="w-12 h-12 text-amber-600 dark:text-amber-400" />
                        )}
                    </div>
                </div>

                {/* Status Text */}
                <div className="text-center mb-8">
                    <h2 className={`text-2xl font-bold mb-2 ${
                        isSuccess ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                        {isSuccess ? 'Connection Successful!' : 'Response Received'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        {data.message || 'The scraper service is responding'}
                    </p>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Server className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-medium text-gray-500">Service</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {data.service || 'Scraper API'}
                        </p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-medium text-gray-500">Timestamp</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {data.timestamp || new Date().toISOString()}
                        </p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Wifi className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-medium text-gray-500">Status</span>
                        </div>
                        <p className={`text-sm font-medium ${
                            isSuccess ? 'text-green-600' : 'text-amber-600'
                        }`}>
                            {data.status || 'unknown'}
                        </p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Mic className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-medium text-gray-500">Response</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {Object.keys(data).length} properties
                        </p>
                    </div>
                </div>

                {/* Sample Data Preview */}
                {data.sample_data && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                            Sample Data Included
                        </h3>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                            The response includes sample data. Check the Explorer tab to inspect it.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MicCheckDemoPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [response, setResponse] = useState<MicCheckResponse | null>(null);
    const [latency, setLatency] = useState<number | null>(null);

    const handleMicCheck = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setResponse(null);
        setLatency(null);

        const startTime = performance.now();

        try {
            const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://server.app.matrxserver.com';
            
            const res = await fetch(`${BACKEND_URL}/api/scraper/mic-check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            const endTime = performance.now();
            setLatency(Math.round(endTime - startTime));

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            }

            // Handle streaming NDJSON response
            if (!res.body) {
                throw new Error('No response body');
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let responseData: MicCheckResponse | null = null;

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const event = JSON.parse(line);
                            if (event.event === 'data') {
                                responseData = event.data;
                            } else if (event.event === 'error') {
                                throw new Error(event.data?.message || 'Mic check failed');
                            } else if (!event.event) {
                                responseData = event;
                            }
                        } catch (e) {
                            if (e instanceof SyntaxError) continue;
                            throw e;
                        }
                    }
                }
            }

            // Process remaining buffer
            if (buffer.trim()) {
                try {
                    const event = JSON.parse(buffer);
                    if (event.event === 'data') {
                        responseData = event.data;
                    } else if (!event.event) {
                        responseData = event;
                    }
                } catch (e) {
                    // Ignore
                }
            }

            setResponse(responseData || { status: 'unknown', message: 'No data in response' });
        } catch (err) {
            console.error('Mic check error:', err);
            setError(err instanceof Error ? err.message : 'Mic check failed');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const inputSection = (
        <div className="flex gap-4 items-center">
            <Button 
                onClick={handleMicCheck} 
                disabled={isLoading}
                size="lg"
                className="px-8"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                    </>
                ) : (
                    <>
                        <Mic className="w-4 h-4 mr-2" />
                        Run Mic Check
                    </>
                )}
            </Button>
            
            {latency !== null && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{latency}ms response time</span>
                </div>
            )}

            <div className="flex-1 text-right text-xs text-gray-400">
                Endpoint: POST /api/scraper/mic-check
            </div>
        </div>
    );

    return (
        <DemoPageLayout
            title="Mic Check"
            description="Test the scraper API connection and view sample response"
            inputSection={inputSection}
        >
            <ResponseViewer
                data={response}
                isLoading={isLoading}
                error={error}
                title="Mic Check Response"
                renderContent={(data) => <RenderedContent data={data as MicCheckResponse} />}
            />
        </DemoPageLayout>
    );
}
