/**
 * Text Diff Feature
 * 
 * Barrel export for all text diff functionality
 */

// Core library functions
export * from './lib/parseDiff';
export * from './lib/matchText';
export * from './lib/applyDiff';

// Types (core types only, component props exported from components)
export type {
  DiffState,
  PendingDiff,
  AcceptedDiff,
  RejectedDiff,
  NoteVersion,
  VersionHistoryState,
  CreateVersionOptions,
  RestoreVersionOptions,
} from './types';

// Components (includes component-specific prop types)
export * from './components';

// Hooks
export * from './hooks';

// Service
export * from './service/versionService';

