/**
 * Smart Components - Redux-Driven UI
 * 
 * These components are fully self-reliant, getting all their data from Redux
 * using a runId and dispatching actions directly.
 * 
 * Benefits:
 * - No prop drilling
 * - No callback management
 * - Automatic state synchronization
 * - Parent components become trivial
 * 
 * Usage:
 * ```tsx
 * <SmartPromptInput runId={runId} />
 * ```
 */

export { SmartPromptInput } from './SmartPromptInput';
export { SmartResourcePickerButton } from './SmartResourcePickerButton';
export { CompactPromptInput } from './CompactPromptInput';
export { CompactPromptModal } from './CompactPromptModal';

