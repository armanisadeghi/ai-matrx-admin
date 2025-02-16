// types/applets/types.ts
import { EntityKeys, EntityData } from "@/types/entityTypes";
import { SchemaEntity } from "@/types/schema";
import { ReactNode } from 'react';
import {SchemaField} from "@/lib/redux/schema/concepts/types";

export interface RecordView {
    id: string;
    name: string;
    icon: ReactNode;
    component: React.ComponentType<RecordViewProps>;
    supports: (record: EntityData<any>) => boolean;
}

export interface RecordViewProps<T extends EntityKeys = any> {
    record: EntityData<T>;
    fields: SchemaField[];
    onUpdate?: (data: Partial<EntityData<T>>) => Promise<void>;
}

export interface RecordAction {
    id: string;
    label: string;
    icon: ReactNode;
    handler: (record: EntityData<any>) => Promise<void>;
    permission?: string;
    category?: 'primary' | 'secondary' | 'destructive';
}

export interface RelatedRecord {
    entityKey: EntityKeys;
    records: EntityData<any>[];
    relationship: 'oneToOne' | 'oneToMany' | 'manyToMany';
    displayField: string;
}


// Core Types
export type AppletLayoutType =
    | 'toolsLayout'
    | 'conversationalLayout'
    | 'dashboardLayout'
    | 'gridLayout'
    | 'listLayout';

export type AppletCategory =
    | "AI"
    | "Automation"
    | "Data Management"
    | "Media"
    | "Communication"
    | "Development"
    | "Business"
    | "Productivity"
    | "Education"
    | "Content"
    | "Learning"
    | "Utilities";

// Entity-Related Types
export interface ToolEntityConfig {
    id: string;
    entityKey: EntityKeys;  // Strict typing from your system
    title: string;
    description: string;
    icon: ReactNode;
    category: 'core' | 'connection';
    badge?: string;
    count?: number;
}

export interface EntityViewConfig {
    defaultLayout: 'table' | 'grid' | 'list';
    defaultSort?: {
        field: string;
        direction: 'asc' | 'desc';
    };
    filters?: FilterConfig[];
    searchableFields?: string[];
}

export interface AppletFieldConfig {
    fieldKey: string;
    displayName: string;
    description?: string;
    visibility: {
        list: boolean;
        detail: boolean;
        edit: boolean;
    };
    component?: {
        type: string;
        props?: Record<string, unknown>;
    };
}

export interface AppletRelationshipConfig {
    type: 'oneToMany' | 'manyToOne' | 'manyToMany';
    relatedEntity: EntityKeys;  // Strict typing
    displayFields: string[];
    navigationConfig?: {
        enabled: boolean;
        route?: string;
    };
}

// Runtime Types
export interface AppletState {
    currentView: string;
    filters: Record<string, unknown>;
    sort: {
        field: string;
        direction: 'asc' | 'desc';
    };
    pagination: {
        page: number;
        pageSize: number;
    };
    selectedItems: string[];
}

// Config Types
export interface AppletStats {
    id: string;
    label: string;
    value: number | string;
    icon?: ReactNode;
}

export interface AppletConfig {
    key: string;
    title: string;
    description: string;
    icon: ReactNode;
    layout: AppletLayoutType;
    category: AppletCategory;
    features?: string[];
    stats?: AppletStats[];
    categories?: Array<{
        id: string;
        title: string;
        description?: string;
    }>;
    sections?: AppletSection[];
    entities?: EntityKeys[];
    displayName?: string;
    beta?: boolean;
    comingSoon?: boolean;
    permissions?: string[];
}

export interface AppletSection {
    id: string;
    title: string;
    description: string;
    icon: ReactNode;
    link: string;
    category: string;
    count?: number;
    badge?: string;
}

// Context Types
export interface AppletEntityContext<T extends EntityKeys> {
    schema: SchemaEntity;
    config: AppletEntityConfig;
    fields: Record<string, SchemaField>;
    data: EntityData<T>[];
    state: AppletState;
}

export interface AppletEntityConfig {
    entityKey: EntityKeys;  // Strict typing
    displayName: string;
    description?: string;
    viewConfig: EntityViewConfig;
    fields: AppletFieldConfig[];
    relationships?: AppletRelationshipConfig[];
}


export interface FilterConfig {
    field: string;
    type: 'select' | 'multiSelect' | 'range' | 'search';
    defaultValue?: unknown;
}

/*
// Hooks and utilities
export function createAppletContext<T extends EntityKeys>(
    entityKey: T,
    config: AppletEntityConfig
) {
    return {
        useAppletEntity: () => {
            // Implementation would go here, using your existing Redux slices
            // This is just the type structure
        },
        useAppletFields: () => {
            // Implementation for field-specific logic
        },
        useAppletState: () => {
            // Implementation for applets state management
        }
    };
}

*/
