// providers/editor/types.ts

// Style definitions
export interface TextStyle {
    text?: {
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        strikethrough?: boolean;
        color?: string;
        fontSize?: string;
        fontFamily?: string;
        alignment?: 'left' | 'center' | 'right' | 'justify';
        lineHeight?: string | number;
    };
    spacing?: {
        letterSpacing?: string;
        wordSpacing?: string;
        indent?: string | number;
    };
    background?: {
        color?: string;
    };
    special?: {
        link?: string;
        codeLanguage?: string;
        quotation?: boolean;
    };
}

// Block types
export interface BaseBlock {
    id: string;
    position: number;
    type: 'text' | 'chip' | 'lineBreak';
    style?: TextStyle;
}

export interface TextBlock extends BaseBlock {
    type: 'text';
    content: string;
    style?: TextStyle;
}

export interface ChipBlock extends BaseBlock {
    type: 'chip';
    content: string;
    label?: string;
    brokerId?: string;
    style?: TextStyle;
}

export interface LineBreakBlock extends BaseBlock {
    type: 'lineBreak';
    content: '';
}

export type ContentBlock = TextBlock | ChipBlock | LineBreakBlock;

export interface DocumentState {
    blocks: ContentBlock[];
    version: number;
    lastUpdate: number;
}

export interface BrokerChipEvent {
    type: 'remove' | 'edit' | 'toggle';
    brokerId: string;
    content?: string;
}

export interface EditorRef {
    ref: React.RefObject<HTMLDivElement>;
    state: DocumentState;
}

export interface EditorContextValue {
    // Core editor state management
    editors: Map<string, EditorRef>;
    registerEditor: (id: string) => void;
    unregisterEditor: (id: string) => void;
    updateState: (id: string, state: DocumentState) => void;
    getEditor: (id: string) => EditorRef | undefined;

    // Content Management
    getState: (editorId: string) => DocumentState | undefined;
    updateContent: (editorId: string, state: DocumentState) => void;
    insertContent: (editorId: string, content: string) => void;
    getFullPlainText: (editorId: string) => string;

    // Selection
    getSelectedText: (editorId: string) => string | null;
    formatSelection: (editorId: string, style: Partial<TextStyle>) => void;

    // Chip Management
    insertChip: (editorId: string, chip: ChipBlock) => void;
    removeChip: (editorId: string, chipId: string) => void;
    updateChip: (editorId: string, chipId: string, content: string) => void;
    convertToChip: (editorId: string, chip: ChipBlock) => void;
    linkChipToBroker: (editorId: string, chipId: string, brokerId: string) => void;
    unlinkChipFromBroker: (editorId: string, chipId: string) => void;
    getChipContent: (editorId: string, chipId: string) => string | null;
    getChipBrokerId: (editorId: string, chipId: string) => string | null;
    getChip: (editorId: string, chipId: string) => ChipBlock | null;

    // Style Management
    getActiveStyles: (editorId: string) => TextStyle;
    resetStyles: (editorId: string) => void;
    applyStyle: (editorId: string, style: Partial<TextStyle>) => void;
    applyStyleToSelection: (editorId: string, style: Partial<TextStyle>) => void;
    applyStyleToChip: (editorId: string, chipId: string, style: Partial<TextStyle>) => void;
}
