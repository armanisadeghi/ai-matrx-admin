import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const ORCHESTRATOR_URL = process.env.MATRX_ORCHESTRATOR_URL || 'http://54.144.86.132:8000'
const ORCHESTRATOR_API_KEY = process.env.MATRX_ORCHESTRATOR_API_KEY || ''

function orchestratorHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (ORCHESTRATOR_API_KEY) {
        headers['X-API-Key'] = ORCHESTRATOR_API_KEY
    }
    return headers
}

export async function GET(
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

        const { data, error } = await supabase
            .from('sandbox_instances')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Sandbox instance not found' }, { status: 404 })
            }
            console.error('Error fetching sandbox instance:', error)
            return NextResponse.json(
                { error: 'Failed to fetch sandbox instance', details: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({ instance: data })
    } catch (error) {
        console.error('Sandbox detail API error:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

export async function PUT(
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

        const body = await request.json()
        const { action } = body

        const { data: instance, error: fetchError } = await supabase
            .from('sandbox_instances')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (fetchError || !instance) {
            return NextResponse.json({ error: 'Sandbox instance not found' }, { status: 404 })
        }

        if (action === 'stop') {
            try {
                const resp = await fetch(
                    `${ORCHESTRATOR_URL}/sandboxes/${instance.sandbox_id}?graceful=true`,
                    { method: 'DELETE', headers: orchestratorHeaders() }
                )
                if (!resp.ok && resp.status !== 404) {
                    console.error('Orchestrator stop failed:', resp.status)
                }
            } catch (fetchErr) {
                console.warn('Orchestrator not reachable during stop — updating DB only:', fetchErr instanceof Error ? fetchErr.message : fetchErr)
            }

            const { data: updated, error: updateError } = await supabase
                .from('sandbox_instances')
                .update({
                    status: 'stopped',
                    stopped_at: new Date().toISOString(),
                    stop_reason: 'user_requested',
                })
                .eq('id', id)
                .select()
                .single()

            if (updateError) {
                console.error('Error updating sandbox instance:', updateError)
                return NextResponse.json(
                    { error: 'Failed to update sandbox status', details: updateError.message },
                    { status: 500 }
                )
            }

            return NextResponse.json({ instance: updated })
        }

        if (action === 'extend') {
            const additionalSeconds = body.ttl_seconds || 3600
            const currentExpiry = instance.expires_at
                ? new Date(instance.expires_at)
                : new Date()
            const newExpiry = new Date(currentExpiry.getTime() + additionalSeconds * 1000)

            const { data: updated, error: updateError } = await supabase
                .from('sandbox_instances')
                .update({
                    expires_at: newExpiry.toISOString(),
                    ttl_seconds: instance.ttl_seconds + additionalSeconds,
                })
                .eq('id', id)
                .select()
                .single()

            if (updateError) {
                return NextResponse.json(
                    { error: 'Failed to extend sandbox TTL', details: updateError.message },
                    { status: 500 }
                )
            }

            return NextResponse.json({ instance: updated })
        }

        return NextResponse.json(
            { error: 'Invalid action. Supported: stop, extend' },
            { status: 400 }
        )
    } catch (error) {
        console.error('Sandbox update API error:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

export async function DELETE(
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

        if (['creating', 'starting', 'ready', 'running'].includes(instance.status)) {
            try {
                const resp = await fetch(
                    `${ORCHESTRATOR_URL}/sandboxes/${instance.sandbox_id}?graceful=false`,
                    { method: 'DELETE', headers: orchestratorHeaders() }
                )
                if (!resp.ok && resp.status !== 404) {
                    console.error('Orchestrator destroy failed:', resp.status)
                }
            } catch (fetchErr) {
                console.warn('Orchestrator not reachable during delete — removing DB record only:', fetchErr instanceof Error ? fetchErr.message : fetchErr)
            }
        }

        const { error: deleteError } = await supabase
            .from('sandbox_instances')
            .delete()
            .eq('id', id)

        if (deleteError) {
            console.error('Error deleting sandbox instance:', deleteError)
            return NextResponse.json(
                { error: 'Failed to delete sandbox instance', details: deleteError.message },
                { status: 500 }
            )
        }

        return new NextResponse(null, { status: 204 })
    } catch (error) {
        console.error('Sandbox delete API error:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
