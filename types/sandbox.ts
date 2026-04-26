export type SandboxStatus =
    | 'creating'
    | 'starting'
    | 'ready'
    | 'running'
    | 'shutting_down'
    | 'stopped'
    | 'failed'
    | 'expired'

export type SandboxStopReason =
    | 'user_requested'
    | 'expired'
    | 'error'
    | 'graceful_shutdown'
    | 'admin'

export type SandboxTier = 'ec2' | 'hosted'

/**
 * Per-sandbox config slot. Free-form JSON. The frontend stuffs `tier` + `template`
 * + `template_version` + `resources` + `labels` here when no dedicated columns
 * exist (db migration to promote them is a follow-up). The orchestrator reads
 * the same payload back via `config` on `SandboxResponse`.
 */
export interface SandboxConfig {
    tier?: SandboxTier
    template?: string
    template_version?: string
    resources?: { cpu?: number; memory_mb?: number; disk_mb?: number }
    labels?: Record<string, string>
    [extraKey: string]: unknown
}

export interface SandboxInstance {
    id: string
    user_id: string
    project_id: string | null
    sandbox_id: string
    status: SandboxStatus
    container_id: string | null
    hot_path: string
    cold_path: string
    config: SandboxConfig
    ttl_seconds: number
    expires_at: string | null
    last_heartbeat_at: string | null
    stopped_at: string | null
    stop_reason: SandboxStopReason | null
    ssh_port: number | null
    created_at: string
    updated_at: string
    deleted_at: string | null
}

export interface SandboxListResponse {
    instances: SandboxInstance[]
    pagination: {
        total: number
        limit: number
        offset: number
        hasMore: boolean
    }
}

export interface SandboxDetailResponse {
    instance: SandboxInstance
}

export interface SandboxExecRequest {
    command: string
    timeout?: number
    cwd?: string
    /** Additional env vars merged into the sandbox default env for this single call. */
    env?: Record<string, string>
    /** Optional stdin payload — bypasses the 10K command-length cap. */
    stdin?: string
}

export interface SandboxExecResponse {
    exit_code: number
    stdout: string
    stderr: string
    cwd: string
}

export interface SandboxCreateRequest {
    project_id?: string
    config?: SandboxConfig
    ttl_seconds?: number
    /** Tier picker — 'ec2' (ephemeral, S3-backed) or 'hosted' (this server, larger workloads). */
    tier?: SandboxTier
    /** Template id; see `GET /api/templates`. */
    template?: string
    template_version?: string
    /** Resource overrides (hosted tier only). */
    resources?: { cpu?: number; memory_mb?: number; disk_mb?: number }
    labels?: Record<string, string>
}

export type SandboxAction = 'stop' | 'extend'

export interface SandboxActionRequest {
    action: SandboxAction
    ttl_seconds?: number
}

export interface SandboxExtendResponse {
    sandbox_id: string
    ttl_seconds: number
    expires_at: string
    new_expires_at: string
}

export interface SandboxTemplate {
    id: string
    version: string
    description: string
    image: string
    tier: SandboxTier | null
    languages: string[]
}

export interface SandboxTemplateListResponse {
    templates: SandboxTemplate[]
}

export interface SandboxAccessResponse {
    /** Orchestrator-level sandbox ID (e.g. "sbx-7712966b8cb5") — used for key filename. */
    sandbox_id: string
    private_key: string
    username: string
    /** Host to SSH into. "localhost" means the sandbox is on internal EC2 infrastructure
     *  and is NOT directly reachable from outside the server. */
    host: string
    port: number
    /** Raw SSH command from the orchestrator. Uses server-side paths — do not show verbatim. */
    ssh_command: string
}

export const ACTIVE_SANDBOX_STATUSES: SandboxStatus[] = [
    'creating',
    'starting',
    'ready',
    'running',
]

export const TERMINAL_SANDBOX_STATUSES: SandboxStatus[] = [
    'stopped',
    'failed',
    'expired',
]
