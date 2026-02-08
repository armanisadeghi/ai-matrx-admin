import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const ORCHESTRATOR_URL = process.env.MATRX_ORCHESTRATOR_URL || 'http://localhost:8000'
const ORCHESTRATOR_API_KEY = process.env.MATRX_ORCHESTRATOR_API_KEY || ''

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
            return NextResponse.json(
                { error: 'User not authenticated' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const projectId = searchParams.get('project_id')
        const status = searchParams.get('status')
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')

        let query = supabase
            .from('sandbox_instances')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (projectId) {
            query = query.eq('project_id', projectId)
        }

        if (status) {
            query = query.eq('status', status)
        }

        const { data, error, count } = await query

        if (error) {
            console.error('Error fetching sandbox instances:', error)
            return NextResponse.json(
                { error: 'Failed to fetch sandbox instances', details: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            instances: data || [],
            pagination: {
                total: count || 0,
                limit,
                offset,
                hasMore: (count || 0) > offset + limit,
            },
        })
    } catch (error) {
        console.error('Sandbox list API error:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
            return NextResponse.json(
                { error: 'User not authenticated' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { project_id, config, ttl_seconds } = body

        if (project_id) {
            const { data: project, error: projectError } = await supabase
                .from('projects')
                .select('id')
                .eq('id', project_id)
                .single()

            if (projectError || !project) {
                return NextResponse.json(
                    { error: 'Project not found' },
                    { status: 404 }
                )
            }
        }

        const { data: activeInstances, error: countError } = await supabase
            .from('sandbox_instances')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
            .in('status', ['creating', 'starting', 'ready', 'running'])

        if (!countError && activeInstances && activeInstances.length >= 5) {
            return NextResponse.json(
                { error: 'Maximum active sandbox limit reached (5). Stop an existing sandbox first.' },
                { status: 429 }
            )
        }

        const orchestratorHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
        }
        if (ORCHESTRATOR_API_KEY) {
            orchestratorHeaders['X-API-Key'] = ORCHESTRATOR_API_KEY
        }

        let orchestratorResp: Response
        try {
            orchestratorResp = await fetch(`${ORCHESTRATOR_URL}/sandboxes`, {
                method: 'POST',
                headers: orchestratorHeaders,
                body: JSON.stringify({
                    user_id: user.id,
                    config: config || {},
                }),
            })
        } catch (fetchError) {
            console.error('Orchestrator connection failed:', fetchError)
            return NextResponse.json(
                { error: 'Sandbox orchestrator is not reachable. Ensure the orchestrator service is running.' },
                { status: 502 }
            )
        }

        if (!orchestratorResp.ok) {
            const errBody = await orchestratorResp.text()
            console.error('Orchestrator create failed:', orchestratorResp.status, errBody)
            return NextResponse.json(
                { error: 'Failed to create sandbox container', details: errBody },
                { status: 502 }
            )
        }

        const orchestratorData = await orchestratorResp.json()
        const effectiveTtl = ttl_seconds || 7200

        const { data: instance, error: insertError } = await supabase
            .from('sandbox_instances')
            .insert({
                user_id: user.id,
                project_id: project_id || null,
                sandbox_id: orchestratorData.sandbox_id,
                status: orchestratorData.status,
                container_id: orchestratorData.container_id,
                hot_path: orchestratorData.hot_path || '/home/agent',
                cold_path: orchestratorData.cold_path || '/data/cold',
                config: config || {},
                ttl_seconds: effectiveTtl,
                expires_at: new Date(Date.now() + effectiveTtl * 1000).toISOString(),
            })
            .select()
            .single()

        if (insertError) {
            console.error('Error saving sandbox instance:', insertError)
            return NextResponse.json(
                { error: 'Sandbox created but failed to save record', details: insertError.message },
                { status: 500 }
            )
        }

        return NextResponse.json({ instance }, { status: 201 })
    } catch (error) {
        console.error('Sandbox create API error:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
