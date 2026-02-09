import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const ORCHESTRATOR_URL = process.env.MATRX_ORCHESTRATOR_URL || 'http://54.144.86.132:8000'
const ORCHESTRATOR_API_KEY = process.env.MATRX_ORCHESTRATOR_API_KEY || ''

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
        }

        const { data: instance, error: fetchError } = await supabase
            .from('sandbox_instances')
            .select('sandbox_id, status')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (fetchError || !instance) {
            return NextResponse.json({ error: 'Sandbox instance not found' }, { status: 404 })
        }

        if (!['ready', 'running'].includes(instance.status)) {
            return NextResponse.json(
                { error: `Sandbox is not running (status: ${instance.status})` },
                { status: 409 }
            )
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (ORCHESTRATOR_API_KEY) {
            headers['X-API-Key'] = ORCHESTRATOR_API_KEY
        }

        try {
            const resp = await fetch(
                `${ORCHESTRATOR_URL}/sandboxes/${instance.sandbox_id}/access`,
                { method: 'POST', headers }
            )

            if (!resp.ok) {
                const errBody = await resp.text()
                console.error('Orchestrator access request failed:', resp.status, errBody)
                return NextResponse.json(
                    { error: 'Failed to generate SSH access', details: errBody },
                    { status: resp.status >= 500 ? 502 : resp.status }
                )
            }

            const result = await resp.json()
            return NextResponse.json(result)
        } catch (fetchError) {
            console.error('Orchestrator connection failed:', fetchError)
            return NextResponse.json(
                { error: 'Sandbox orchestrator is not reachable. Ensure the orchestrator service is running.' },
                { status: 502 }
            )
        }
    } catch (error) {
        console.error('Sandbox access API error:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
