// features/rich-text-editor/types/editor.types.ts
import { MatrxRecordId } from '@/types';
import { RefObject } from 'react';
import { TailwindColor } from '../constants';

// Base Types
export interface ChipRequestOptions {
    id?: string;
    label?: string;
    stringValue?: string;
    color?: string;
    brokerId?: MatrxRecordId;
}

export interface ChipData {
    id: string;
    label: string;
    color?: string;
    stringValue?: string;
    brokerId?: MatrxRecordId;
    editorId?: MatrxRecordId;
}

export interface TextStyle {
    command: string;
    value?: string | null;
}

// State Types
export interface EditorState {
    plainTextContent: string;
    chipData: ChipData[];
    colorAssignments: Map<string, string>;
    chipCounter?: number;
    draggedChip?: HTMLElement | null;
}

export interface EditorInstanceState {
    ref: RefObject<HTMLDivElement>;
    state: EditorState;
    plainTextContent: string; // Regular text with chip placeholders {id}!
    fullTextContent: string; // Text with actual chip values inserted
    chipData: ChipData[];
    brokerAssociations: Map<string, Set<string>>; // chipId -> Set of brokerIds
}

// Event Handler Types
export interface DOMEventHandlers {
    handleNativeDragStart: (e: DragEvent) => void;
    handleNativeDragEnd: (e: DragEvent) => void;
}

export interface ReactEventHandlers {
    handleDragOver: (e: React.DragEvent<HTMLElement>) => void;
    handleDrop: (e: React.DragEvent<HTMLElement>) => void;
}

// Content Types
export interface ContentInput {
    type: 'plain' | 'withChips' | 'withBrokers';
    content: string;
    chips?: ChipData[];
    brokerMappings?: Map<string, MatrxRecordId>;
}

// Provider Types
export interface EditorProviderState {
    editors: Map<string, EditorInstanceState>;
    globalChips: Map<string, ChipData>;
    globalBrokers: Map<string, Set<string>>;
}

export interface ChipVerificationResult {
    mismatches: Array<{ chipId: string; domContent: string; stateContent: string }>;
    orphanedChips: string[];
    missingChips: string[];
}

export type EditorStateUpdate =
    | { type: 'updateColorAssignments'; id: string; color: string }
    | { type: 'addChip'; chip: ChipData }
    | { type: 'removeChip'; chipId: string }
    | { type: 'updateContent'; content: string }
    | { type: 'updateContent'; content: string }
    | { type: 'incrementChipCounter' }
    | { type: 'applyStyle'; style: TextStyle }



export interface EditorProviderContext {
    // Editor Instance Management
    registerEditor: (id: string, ref: RefObject<HTMLDivElement>) => void;
    unregisterEditor: (id: string) => void;

    // Editor State Access
    getEditorState: (id: string) => EditorInstanceState;
    updateEditorState: (editorId: string, update: EditorStateUpdate) => void;

    // Content Management
    setEditorContent: (id: string, content: ContentInput) => void;
    getPlainTextContent: (id: string) => string;
    getFullTextContent: (id: string) => string;

    // Chip Management
    insertChip: (editorId: string, options: ChipRequestOptions) => void;
    updateChip: (chipId: string, updates: Partial<ChipData>) => void;
    removeChip: (chipId: string) => void;

    // Chip Queries
    findChipById: (chipId: string, scope?: 'editor' | 'global') => ChipData | null;
    findChipsByBrokerId: (brokerId: MatrxRecordId, scope?: 'editor' | 'global') => ChipData[];
    getAllChips: (scope?: 'editor' | 'global') => ChipData[];
    getChipContent: (chipId: string) => string;

    // Broker Operations
    getBrokerAssociations: (brokerId: MatrxRecordId) => Set<string>;
    getUniqueBrokerIds: () => MatrxRecordId[];

    // DOM Verification
    verifyChipsFromDOM: () => ChipVerificationResult;
    recoverChipContent: (chipId: string) => string;
    analyzeChipDistribution: () => { [key: string]: number };

    // Subscriptions
    subscribeToEditorChanges: (editorId: string, callback: (state: EditorInstanceState) => void) => () => void;
    subscribeToChipChanges: (callback: (chips: Map<string, ChipData>) => void) => () => void;
}

// Hook Result Types
export interface UseEditorResult {
    state: EditorInstanceState;
    setContent: (input: ContentInput) => void;
    updateContent: (content: string) => void;
    focus: () => void;
    normalize: () => void;
}

export interface ColorOption {
    color: TailwindColor;
    className: string;
}

export interface UseEditorChipsResult {
    chips: ChipData[];
    insertChip: (options: ChipRequestOptions) => void;
    updateChip: (chipId: string, updates: Partial<ChipData>) => void;
    removeChip: (chipId: string) => void;
    convertSelectionToChip: () => boolean;
    getBrokerChips: (brokerId: MatrxRecordId) => ChipData[];
    createNewChipData: (editorId: string, options: ChipRequestOptions) => ChipData;

}



export interface UseEditorStylesResult {
    applyStyle: (style: TextStyle) => void;
    getCurrentStyle: () => TextStyle;
    clearStyle: () => void;
}

// Component Props Types
export interface RichTextEditorProps {
    id: string;
    onChange?: (content: string) => void;
    className?: string;
    onDragOver?: (e: React.DragEvent<HTMLElement>) => void;
    onDrop?: (e: React.DragEvent<HTMLElement>) => void;
}

export interface DOMSnapshot {
    selection: {
        anchorNode: Node | null;
        focusNode: Node | null;
        anchorOffset: number;
        focusOffset: number;
        isCollapsed: boolean;
    };
    range: {
        startOffset: number;
        endOffset: number;
        startContainer: Node;
        endContainer: Node;
        commonAncestorContainer: Node;
    };
    editor: {
        activeElement: Element | null;
        editorNode: HTMLElement;
        currentContainer: Node;
        caretPosition: number;
    };
}


