// types.ts
export interface ChipData {
    id: string;
    name: string;
}

export interface EditorRef {
    current: HTMLDivElement | null;
}

export interface TextStyle {
    command: string;
    value?: string | null;
}

export interface ToolbarProps {
    onApplyStyle: (style: TextStyle) => void;
    onInsertChip: () => void;
}

export interface ToolbarButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    title?: string;
    className?: string;
}

export interface ColorOption {
    label: string;
    value: string;
}

export interface FontSizeOption {
    label: string;
    value: string;
}