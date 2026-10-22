/**
 * Sharing Components - Main Exports
 * 
 * Generic, reusable sharing components that work with ANY resource type.
 * Just pass resourceType, resourceId, and resourceName as props.
 */

export { ShareButton } from './ShareButton';
export { ShareModal } from '@ai-matrx/sharing/react';
export { AccessSummaryPanel } from '@ai-matrx/sharing/react';
/** The `share` port binding @ai-matrx/records-ui asks its host for. */
export { recordStoreShare } from './RecordStoreShareSurface';
export { PermissionsList } from '@ai-matrx/sharing/react';
export { PermissionBadge, PublicBadge, PermissionLevelDescription } from '@ai-matrx/sharing/react';

// Tab components (internal use, but exported for flexibility)
export { ShareWithUserTab } from '@ai-matrx/sharing/react';
export { PublicAccessTab } from '@ai-matrx/sharing/react';

