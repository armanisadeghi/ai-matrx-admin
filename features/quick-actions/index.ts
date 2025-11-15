// features/quick-actions/index.ts

/**
 * Quick Actions Feature
 * 
 * Provides quick access to various features through a dropdown menu and utilities hub.
 * Includes Notes, Tasks, Chat, and Data quick access sheets.
 */

// Main Components
export { QuickActionsMenu } from './components/QuickActionsMenu';
export { UtilitiesOverlay } from './components/UtilitiesOverlay';

// Quick Sheet Components
export { QuickChatSheet } from './components/QuickChatSheet';
export { QuickDataSheet } from './components/QuickDataSheet';
export { QuickFilesSheet } from './components/QuickFilesSheet';

// Hooks
export { useQuickActions } from './hooks/useQuickActions';

