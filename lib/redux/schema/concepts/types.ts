// lib/schema/types.ts

// Type definitions for schema concepts
export interface LayoutConfig {
    [key: string]: any;
}

export interface BaseSchemaField {
    [key: string]: any;
}

export interface UnifiedSchemaAll {
    id: string;
    type: 'entity' | 'form' | 'component' | 'view' | 'report' | 'workflow';
    name: string;
    fields: SchemaField[];
    metadata: {
        source: 'database' | 'memory' | 'api' | 'custom';
        persistence?: boolean;
        caching?: boolean;
        validation?: boolean;
        tracking?: boolean;
    };
    behaviors?: {
        onCreate?: string[];
        onUpdate?: string[];
        onDelete?: string[];
        onValidate?: string[];
        onTransform?: string[];
    };
    presentation?: {
        defaultLayout: 'grid' | 'sections' | 'accordion' | 'tabs' | 'masonry' | 'carousel' | 'timeline';
        layouts?: Record<string, LayoutConfig>;
        styling?: Record<string, any>;
        animations?: Record<string, any>;
    };
    relationships?: {
        dependencies?: string[];
        references?: string[];
        triggers?: string[];
    };
}

export interface SchemaField extends BaseSchemaField {
    presentation?: {
        component: string;
        props?: Record<string, any>;
        layout?: {
            section?: string;
            order?: number;
            width?: string;
            visibility?: {
                conditions: Array<{
                    field: string;
                    operator: string;
                    value: any;
                }>;
            };
        };
        validation?: {
            client?: Array<{
                type: string;
                params?: any;
                message: string;
            }>;
            server?: Array<{
                type: string;
                params?: any;
                message: string;
            }>;
        };
        transformation?: {
            display?: string;
            storage?: string;
        };
    };
}
