// ============================================================================
// Versioning Feature — Public API
// ============================================================================

// Types
export type {
    VersionEntityType,
    VersionHistoryItem,
    VersionSnapshot,
    VersionDiff,
    PromoteVersionResult,
    DriftItem,
    PinVersionResult,
    VersionHistoryState,
    VersionDiffState,
    VersionSnapshotState,
} from './types';

// Services
export {
    getVersionHistory,
    getVersionSnapshot,
    getVersionDiff,
    promoteVersion,
    restoreVersion,
    purgeOldVersions,
    pinPromptAppToVersion,
    checkPromptAppDrift,
} from './services/versionService';

// Hooks
export { useVersionHistory } from './hooks/useVersionHistory';
export { usePromptAppDrift } from './hooks/usePromptAppDrift';

// Components
export {
    VersionBadge,
    VersionHistoryPanel,
    VersionDiffView,
    VersionSnapshotView,
    DriftWarningBanner,
    VersionPinInfo,
    PinUpgradeDialog,
} from './components';
