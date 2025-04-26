import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface BasePanelProps {
    id: string;
    order: number;
    number: number;
    label: string;
    streamingText: string;
    onDelete?: (id: string) => void;
    onDragDrop?: (draggedId: string, targetId: string) => void;
    onLabelChange?: (id: string, newLabel: string) => void;
    debug?: boolean;
    onDebugClick?: (id: string) => void;
    minSize?: number;
    addAssistantResponse?: (response: string) => void;
}

export interface PanelConfig {
    id: string;
    component: React.ComponentType<BasePanelProps>;
    defaultProps?: Partial<Omit<BasePanelProps, 'key'>>;
    icon: LucideIcon;
    label: string;
    value: string;
}

