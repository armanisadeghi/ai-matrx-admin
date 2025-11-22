/**
 * Streaming Diff Blocks - Public API
 */

export { StreamingDiffBlock } from './StreamingDiffBlock';
export { DiffLoadingIndicator } from './DiffLoadingIndicator';
export { DiffCollapsible } from './DiffCollapsible';
export { SearchReplaceDiffRenderer } from './renderers/SearchReplaceDiffRenderer';
export { detectDiffStyle, getDiffStyleHandler, looksLikeDiff } from './diff-style-registry';
export type { DiffStyle, StreamingDiffState, SearchReplaceBlock, DiffStyleDetection, DiffStyleHandler } from './types';

