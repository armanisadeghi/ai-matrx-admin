// field-actions/types.ts
import {EntityStateFieldWithValue} from "@/lib/redux/entity/types/stateTypes";

export enum ActionType {
    EDIT = 'edit',
    LINK = 'link',
    CODE = 'code',
    FILE = 'file',
    DATETIME = 'datetime',
    URL = 'url',
    JSON = 'json',
    LOOKUP = 'lookup',
    REFRESH = 'refresh',
    CUSTOM = 'custom'
}


export enum PresentationType {
    MODAL = 'modal',
    SHEET = 'sheet',
    POPOVER = 'popover',
    INLINE = 'inline',
    CUSTOM = 'custom',
    SECTION = 'section',  // New: Render in a specific page section
    DYNAMIC = 'dynamic',   // New: Dynamically create and render in a new section
    FLOATING = 'floating',  // New: Render in a floating container

}


export enum RenderLocation {
    INLINE = 'inline',          // Render right where the action is
    ADJACENT = 'adjacent',      // Render next to the action
    SECTION = 'section',        // Render in a predefined section
    FLOATING = 'floating',      // Render in a floating container
    CUSTOM = 'custom'          // Custom render location
}


export interface PrewiredComponentConfig {
    component: React.ComponentType<any>;
    props: Record<string, any>;
    requirements?: {
        state?: string[];        // Required state slices
        actions?: string[];      // Required Redux actions
        permissions?: string[];  // Required user permissions
    };
}


import {ReactNode} from 'react';
import {EntityStateField} from "@/lib/redux/entity/types/stateTypes";

export interface ActionTargetConfig {
    location: RenderLocation;
    sectionId?: string;        // ID of target section if using SECTION location
    position?: 'before' | 'after' | 'replace' | 'append' | 'prepend';
    animation?: string;        // Optional animation configuration
    clearOnClose?: boolean;    // Whether to clear content when action closes
}

export interface ContainerProps {
    title?: string;
    className?: string;
    side?: 'left' | 'right' | 'top' | 'bottom';
    width?: string;
    height?: string;
    children?: ReactNode;
    target?: ActionTargetConfig;
    onClose?: () => void;

    [key: string]: any;
}

export interface FieldActionProps {
    field: FieldConfig;
    value: any;
    onChange: (e: { target: { value: any } }) => void;
    onAction?: (field: FieldConfig, value: any) => void;
    renderTarget?: ActionTargetConfig;
}

export interface FieldConfig {
    id: string;
    label: string;
    type: string;
    actions?: ActionConfig[];
    renderLocations?: Record<string, ActionTargetConfig>;

    [key: string]: any;
}

export interface ActionConfig {
    type: ActionType;
    icon: React.ComponentType<any>;
    label: string;
    presentation: PresentationType;
    buttonStyle: 'icon' | 'full';
    component: React.ComponentType<any>;
    props?: Record<string, any>;
    handleAction?: (field: FieldConfig, value: any) => void;
    shouldShow?: (field: FieldConfig) => boolean;
    containerProps?: ContainerProps;
    renderContainer?: (props: { trigger: ReactNode; content: ReactNode; [key: string]: any }) => ReactNode;
    target?: ActionTargetConfig;
}


export interface SyncConfig {
    key: string;
    dependencies?: string[];
    debounceMs?: number;
    optimistic?: boolean;
    retryConfig?: {
        maxAttempts: number;
        backoffMs: number;
    };
}

export interface ErrorConfig {
    message?: string;
    level: 'error' | 'warning' | 'info';
    action?: 'retry' | 'ignore' | 'revert' | 'custom';
    customAction?: () => void;
}

export interface RouteConfig {
    path: string;
    params?: Record<string, string | number>;
    query?: Record<string, string>;
    scroll?: boolean;
    prefetch?: boolean;
}

export interface RecordDisplayConfig {
    presentation: PresentationType;
    title?: string;
    layout?: 'form' | 'grid' | 'table' | 'custom';
    showFields?: Array<EntityStateField['name']>;
    hideFields?: Array<EntityStateField['name']>;
    groupFields?: Record<string, Array<EntityStateField['name']>>;
    customComponents?: Record<string, React.ComponentType<{ field: EntityStateFieldWithValue }>>;
    actions?: Record<string, ActionConfig>;
}

