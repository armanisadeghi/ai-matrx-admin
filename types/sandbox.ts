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

export interface SandboxInstance {
    id: string
    user_id: string
    project_id: string | null
    sandbox_id: string
    status: SandboxStatus
    container_id: string | null
    hot_path: string
    cold_path: string
    config: Record<string, unknown>
    ttl_seconds: number
    expires_at: string | null
    last_heartbeat_at: string | null
    stopped_at: string | null
    stop_reason: SandboxStopReason | null
    ssh_port: number | null
    created_at: string
    updated_at: string
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
}

export interface SandboxExecResponse {
    exit_code: number
    stdout: string
    stderr: string
}

export interface SandboxCreateRequest {
    project_id?: string
    config?: Record<string, unknown>
    ttl_seconds?: number
}

export type SandboxAction = 'stop' | 'extend'

export interface SandboxActionRequest {
    action: SandboxAction
    ttl_seconds?: number
}

export interface SandboxAccessResponse {
    private_key: string
    username: string
    host: string
    port: number
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
