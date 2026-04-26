/**
 * Orchestrator URL/key resolution for the two-tier sandbox model.
 *
 * Each sandbox is hosted on exactly one orchestrator (EC2 or hosted on the
 * Matrx dev server). The tier is captured at create time and persisted in the
 * sandbox row's `config.tier` field. Every per-sandbox proxy route (`/exec`,
 * `/fs/*`, `/git/*`, `/extend`, …) reads the row, resolves the tier, and
 * forwards to the matching orchestrator URL with the matching API key.
 *
 * This is a server-only module — never import from a Client Component.
 */

import { createClient } from '@/utils/supabase/server'
import type { SandboxConfig, SandboxTier } from '@/types/sandbox'

const EC2_URL = process.env.MATRX_ORCHESTRATOR_URL || 'http://54.144.86.132:8000'
const EC2_KEY = process.env.MATRX_ORCHESTRATOR_API_KEY || ''
const HOSTED_URL = process.env.MATRX_HOSTED_ORCHESTRATOR_URL || 'https://orchestrator.dev.codematrx.com'
const HOSTED_KEY = process.env.MATRX_HOSTED_ORCHESTRATOR_API_KEY || ''

export interface OrchestratorTarget {
    /** Base URL, no trailing slash. */
    url: string
    /** API key (sent as `X-API-Key`). May be empty for local dev. */
    apiKey: string
    /** Resolved tier — either explicit or 'ec2' (back-compat default). */
    tier: SandboxTier
}

/**
 * Resolve which orchestrator to forward a request to based on a sandbox's
 * persisted tier. Rows without an explicit tier default to EC2 — that
 * preserves behavior for sandboxes created before the tier model existed.
 */
export function resolveOrchestratorByTier(tier: SandboxTier | null | undefined): OrchestratorTarget {
    if (tier === 'hosted') {
        return { url: HOSTED_URL.replace(/\/$/, ''), apiKey: HOSTED_KEY, tier: 'hosted' }
    }
    return { url: EC2_URL.replace(/\/$/, ''), apiKey: EC2_KEY, tier: 'ec2' }
}

/**
 * Look up a sandbox by its row id (the Postgres UUID, not the orchestrator's
 * `sandbox_id`), enforce ownership against the current Supabase user, and
 * resolve its orchestrator target plus the upstream `sandbox_id`.
 *
 * Returns `null` for the orchestrator field on errors so callers can build a
 * single response without a try/catch chain.
 */
export async function lookupSandboxAndOrchestrator(
    sandboxRowId: string
): Promise<
    | {
          ok: true
          orchestrator: OrchestratorTarget
          sandboxId: string
          status: string
      }
    | { ok: false; status: number; error: string }
> {
    const supabase = await createClient()
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return { ok: false, status: 401, error: 'User not authenticated' }
    }

    const { data, error } = await supabase
        .from('sandbox_instances')
        .select('sandbox_id, status, config')
        .eq('id', sandboxRowId)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single()

    if (error || !data) {
        return { ok: false, status: 404, error: 'Sandbox instance not found' }
    }

    const tier = ((data.config as SandboxConfig | null)?.tier ?? null) as SandboxTier | null
    return {
        ok: true,
        orchestrator: resolveOrchestratorByTier(tier),
        sandboxId: data.sandbox_id,
        status: data.status,
    }
}

/**
 * Build the standard headers we send to the orchestrator on JSON calls.
 * Caller can spread additional headers on top.
 */
export function orchestratorJsonHeaders(target: OrchestratorTarget): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (target.apiKey) headers['X-API-Key'] = target.apiKey
    return headers
}
