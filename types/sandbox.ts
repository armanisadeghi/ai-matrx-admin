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

/**
 * Per-user persistent storage info, returned by the orchestrator's
 * `GET /users/{user_id}/persistence` endpoint (Phase 1+2+3 of the persistence
 * plan). Each tier has its own storage backing:
 *
 *   - **hosted**: a per-user Docker volume (`matrx-user-<uid>`) mounted at
 *     `/home/agent`, surviving container destruction.
 *   - **ec2**: S3 prefix per user (existing pre-Phase-1 behavior). The
 *     volume API on the EC2 orchestrator may report `kind: 's3'` rather
 *     than a real Docker volume.
 *
 * Fields are optional because the orchestrator may not return every shape on
 * every tier (e.g. EC2 has no `volume_name`, hosted has no `s3_prefix` until
 * Phase 6). Treat any missing field as "unknown" rather than zero.
 */
export interface UserPersistenceInfo {
    user_id: string
    tier: SandboxTier
    /** Docker volume name on hosted; null/undefined on EC2 until Phase 6. */
    volume_name?: string | null
    /** Bytes currently used on disk. May be `null` if the orchestrator hasn't
     *  finished its size sweep — show "—" rather than "0 B" in that case. */
    current_size_bytes?: number | null
    /** How many sandbox rows currently reference this volume/prefix. */
    sandbox_count?: number
    /** S3 prefix where the volume is being mirrored (Phase 6 — may be absent). */
    s3_prefix?: string | null
    /** True if any sandbox is still mounted to this volume — DELETE will refuse. */
    in_use?: boolean
    /** Optional last-modified or last-sync timestamp from the orchestrator. */
    last_synced_at?: string | null
}

/**
 * Aggregated persistence response. The Next.js API route can talk to one or
 * both orchestrators and stitch a per-tier breakdown together. `total_size_bytes`
 * is the sum of all tiers we got data from; rows where size is `null` are
 * skipped from the sum (and `partial: true` flags the response).
 */
export interface UserPersistenceResponse {
    user_id: string
    total_size_bytes: number
    /** True if at least one tier returned no data or partial data. */
    partial: boolean
    tiers: UserPersistenceInfo[]
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
