/**
 * Universal Prompt Editor - A reusable prompt editor for prompts, templates, and builtins
 * 
 * @module universal-editor
 */

// Core editor (for custom implementations)
export { UniversalPromptEditor } from './UniversalPromptEditor';
export type {
    UniversalPromptData,
    UniversalPromptEditorProps,
    PromptSourceType,
} from './types';
export { normalizePromptData, denormalizePromptData } from './types';

// Ready-to-use editors (most common use case)
export { PromptEditor, TemplateEditor, BuiltinEditor } from './editors';

