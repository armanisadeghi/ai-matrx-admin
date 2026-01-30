/**
 * Types for shared prompts functionality
 */

import type { PermissionLevel } from "@/utils/permissions/types";

/**
 * Shared prompt data from get_prompts_shared_with_me() RPC
 */
export interface SharedPrompt {
    id: string;
    name: string;
    description?: string | null;
    permissionLevel: PermissionLevel;
    ownerEmail: string;
}

/**
 * Access level info from get_prompt_access_level() RPC
 */
export interface PromptAccessInfo {
    isOwner: boolean;
    permissionLevel: PermissionLevel | null;
    ownerEmail: string | null;
    canEdit: boolean;
    canDelete: boolean;
}

/**
 * Props for components that need access info
 */
export interface WithAccessInfoProps {
    accessInfo?: PromptAccessInfo;
}
