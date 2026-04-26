import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import {
    resolveOrchestratorByTier,
    orchestratorJsonHeaders,
} from '@/lib/sandbox/orchestrator-routing'
import type { SandboxConfig, SandboxTier } from '@/types/sandbox'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const projectId = searchParams.get('project_id')
        const status = searchParams.get('status')
        const tier = searchParams.get('tier')
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')

        const includeDeleted = searchParams.get('include_deleted') === 'true'

        let query = supabase
            .from('sandbox_instances')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (!includeDeleted) {
            query = query.is('deleted_at', null)
        }
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

        // Optional client-side tier filter — we store tier in `config` (JSONB)
        // until we promote it to a column, so a SQL-side filter would need a
        // JSON path operator. Filtering in JS is fine for the modest list size.
        let instances = data || []
        if (tier) {
            instances = instances.filter(
                (row) => (row.config as SandboxConfig | null)?.tier === tier
            )
        }

        return NextResponse.json({
            instances,
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
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
        }

        const body = await request.json()
        const {
            project_id,
            config,
            ttl_seconds,
            tier: tierInput,
            template,
            template_version,
            resources,
            labels,
        } = body as {
            project_id?: string
            config?: SandboxConfig
            ttl_seconds?: number
            tier?: SandboxTier
            template?: string
            template_version?: string
            resources?: { cpu?: number; memory_mb?: number; disk_mb?: number }
            labels?: Record<string, string>
        }

        if (project_id) {
            const { data: project, error: projectError } = await supabase
                .from('ctx_projects')
                .select('id')
                .eq('id', project_id)
                .single()

            if (projectError || !project) {
                return NextResponse.json({ error: 'Project not found' }, { status: 404 })
            }
        }

        const { data: activeInstances, error: countError } = await supabase
            .from('sandbox_instances')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
            .in('status', ['creating', 'starting', 'ready', 'running'])

        if (!countError && activeInstances && activeInstances.length >= 5) {
            return NextResponse.json(
                {
                    error:
                        'Maximum active sandbox limit reached (5). Stop an existing sandbox first.',
                },
                { status: 429 }
            )
        }

        // Resolve tier — explicit > config.tier > default 'ec2' for back-compat.
        const tier: SandboxTier = tierInput || (config?.tier as SandboxTier) || 'ec2'
        const target = resolveOrchestratorByTier(tier)

        // Forward to the matching orchestrator.
        const orchestratorBody: Record<string, unknown> = {
            user_id: user.id,
            config: config || {},
            tier,
        }
        if (template) orchestratorBody.template = template
        if (template_version) orchestratorBody.template_version = template_version
        if (resources) orchestratorBody.resources = resources
        if (labels) orchestratorBody.labels = labels
        if (ttl_seconds) orchestratorBody.ttl_seconds = ttl_seconds

        let orchestratorResp: Response
        try {
            orchestratorResp = await fetch(`${target.url}/sandboxes`, {
                method: 'POST',
                headers: orchestratorJsonHeaders(target),
                body: JSON.stringify(orchestratorBody),
            })
        } catch (fetchError) {
            console.error(`Orchestrator (${tier}) connection failed:`, fetchError)
            return NextResponse.json(
                {
                    error: `Sandbox orchestrator (${tier}) is not reachable. Ensure the orchestrator service is running.`,
                },
                { status: 502 }
            )
        }

        if (!orchestratorResp.ok) {
            const errBody = await orchestratorResp.text()
            console.error(`Orchestrator create (${tier}) failed:`, orchestratorResp.status, errBody)
            return NextResponse.json(
                { error: 'Failed to create sandbox container', details: errBody },
                { status: orchestratorResp.status === 400 ? 400 : 502 }
            )
        }

        const orchestratorData = await orchestratorResp.json()
        const effectiveTtl = ttl_seconds || orchestratorData?.ttl_seconds || 7200

        // Pack tier/template/resources/labels into config until we have dedicated
        // columns (a follow-up Supabase migration). The orchestrator's response
        // also includes these fields as top-level — we keep our copy in `config`
        // for the routing logic in lookupSandboxAndOrchestrator.
        const persistedConfig: SandboxConfig = {
            ...(config || {}),
            tier,
            ...(template ? { template } : {}),
            ...(template_version ? { template_version } : {}),
            ...(resources ? { resources } : {}),
            ...(labels ? { labels } : {}),
        }

        const sandboxRecord = {
            user_id: user.id,
            project_id: project_id || null,
            sandbox_id: orchestratorData.sandbox_id,
            status: orchestratorData.status,
            container_id: orchestratorData.container_id,
            hot_path: orchestratorData.hot_path || '/home/agent',
            cold_path: orchestratorData.cold_path || '/data/cold',
            config: persistedConfig,
            ttl_seconds: effectiveTtl,
            expires_at:
                orchestratorData.expires_at ||
                new Date(Date.now() + effectiveTtl * 1000).toISOString(),
        }

        const { data: instance, error: insertError } = await supabase
            .from('sandbox_instances')
            .upsert(sandboxRecord, { onConflict: 'sandbox_id' })
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
