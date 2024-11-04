/*
// Utility types for better type safety
import {EntityNameOfficial} from "@/types/schema";
import {DataStructure, FieldDataOptionsType} from "@/types/AutomationSchemaTypes";
import {TypeBrand} from "@/types/entityTypes";

type RelationshipType = 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
type SchemaType = 'table' | 'view' | 'dynamic' | 'other';
type FetchStrategy = "m2mAndFk" | "simple" | "m2mAndIfk" | "fk" | "none" | "fkIfkAndM2M" | "ifk" | "fkAndIfk" | "m2m";

// Enhanced validation function type
interface ValidationFunction {
    name: string;
    params?: Record<string, unknown>;
    errorMessage?: string;
}

// Enhanced field metadata
interface FieldMetadata {
    description?: string;
    searchable?: boolean;
    filterable?: boolean;
    sortable?: boolean;
    hidden?: boolean;
    groupable?: boolean;
    encrypted?: boolean;
    audit?: boolean;
}

// Enhanced relationship definition
interface Relationship {
    relationshipType: RelationshipType;
    column: string;
    relatedTable: string;
    relatedColumn: string;
    junctionTable: string | null;
    // New fields
    cascade?: 'DELETE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    eager?: boolean;
    alias?: string;
    orderBy?: {
        column: string;
        direction: 'ASC' | 'DESC';
    };
    constraints?: {
        onUpdate?: 'CASCADE' | 'RESTRICT' | 'SET NULL' | 'NO ACTION';
        onDelete?: 'CASCADE' | 'RESTRICT' | 'SET NULL' | 'NO ACTION';
    };
}

// Enhanced schema field definition
interface SchemaField {
    // Core field properties
    fieldName: string;
    entityName: EntityNameOfficial;
    dataType: FieldDataOptionsType;
    isArray: boolean;
    structure: DataStructure;

    // Type information
    isNative: boolean;
    typeReference: TypeBrand<any>;

    // UI/Component properties
    defaultComponent?: string;
    componentProps?: Record<string, unknown>;

    // Validation and constraints
    isRequired: boolean;
    maxLength: number;
    minLength?: number;
    defaultValue: any;
    isPrimaryKey: boolean;
    isDisplayField?: boolean;
    isUnique?: boolean;

    // Generation and validation
    defaultGeneratorFunction: string;
    validationFunctions: ValidationFunction[];
    exclusionRules: string[];

    // Database properties
    databaseTable: string;
    indexed?: boolean;

    // Additional metadata
    metadata?: FieldMetadata;

    // Computed properties
    computed?: {
        expression: string;
        dependencies: string[];
        caching?: boolean;
    };

    // Versioning
    versionTracking?: boolean;

    // Access control
    permissions?: {
        read?: string[];
        write?: string[];
        delete?: string[];
    };
}

// Enhanced schema entity definition
interface SchemaEntity {
    // Core properties
    entityName: EntityNameOfficial;
    schemaType: SchemaType;
    primaryKey: string | string[];
    defaultFetchStrategy: FetchStrategy;

    // Relationships and components
    relationships: Relationship[];
    componentProps?: Record<string, any>;

    // New properties
    displayName?: string;
    description?: string;

    // Versioning
    versioning?: {
        enabled: boolean;
        strategy: 'timestamp' | 'number';
        field: string;
    };

    // Indexing
    indexes?: Array<{
        name: string;
        columns: string[];
        unique?: boolean;
        type?: 'btree' | 'hash' | 'gist' | 'gin';
    }>;

    // Constraints
    constraints?: Array<{
        type: 'unique' | 'check' | 'exclude';
        name: string;
        definition: string;
    }>;

    // Caching
    caching?: {
        strategy: 'memory' | 'redis' | 'none';
        ttl?: number;
        invalidationTriggers?: string[];
    };

    // Access control
    security?: {
        defaultPermissions: {
            read?: string[];
            write?: string[];
            delete?: string[];
        };
        rowLevelSecurity?: {
            enabled: boolean;
            policies?: Array<{
                name: string;
                using: string;
                check?: string;
                roles?: string[];
            }>;
        };
    };

    // Audit
    audit?: {
        enabled: boolean;
        fields?: string[];
        excludeFields?: string[];
        retention?: number;
    };
}



// Relationship tracking types
type RelationshipCache = {
    [key: string]: {
        loaded: boolean;
        loading: boolean;
        error: Error | null;
        data: Record<string, unknown>[];
        lastFetched?: Date;
    };
};

type ValidationState = {
    errors: Record<string, string[]>;
    warnings: Record<string, string[]>;
    validationStatus: 'unvalidated' | 'validating' | 'valid' | 'invalid';
    lastValidated?: Date;
};

type ComponentState = {
    activeComponents: Set<string>;  // Track which components are currently mounted
    componentData: Record<string, unknown>;  // Component-specific state
    renderStrategy: Record<string, {
        component: string;
        props: Record<string, unknown>;
    }>;
};

/!*
type FetchStrategy = {
    strategy: SchemaEntity['defaultFetchStrategy'];
    includedRelationships: Set<string>;
    excludedRelationships: Set<string>;
    depth: number;
    maxResults?: number;
};

// Enhanced selection state to handle composite keys
type EnhancedSelectionState<TEntity> = {
    selectedItems: Set<string>;  // Stringified composite keys when necessary
    activeItem: EntityData<TEntity> | null;
    selectionMode: 'single' | 'multiple' | 'none';
    selectionConstraints?: {
        maxItems?: number;
        filter?: (item: EntityData<TEntity>) => boolean;
    };
};

// Enhanced filter state to handle complex relationships
type EnhancedFilterState = {
    filters: {
        simple: Record<string, unknown>;
        relationship: Record<string, {
            table: string;
            condition: Record<string, unknown>;
        }>;
        custom: Array<(item: any) => boolean>;
    };
    sort: Array<{
        field: string;
        direction: 'asc' | 'desc';
        relationshipPath?: string[];
    }>;
};
*!/

/!*
// Main slice state definition
type EntitySliceState<TEntity extends EntityKeys> = {
    // Core data
    data: Array<EntityData<TEntity>>;
    quickReference: {
        pkAndDisplayFields: Array<{
            pkValue: string;  // Stringified composite key support
            displayValue?: string;
            metadata?: Record<string, unknown>;
        }>;
        lastUpdated: Date;
    };

    // Schema and configuration
    schema: {
        entity: SchemaEntity;
        fields: Record<string, SchemaField>;
        computedFields?: Record<string, {
            dependencies: string[];
            compute: (data: EntityData<TEntity>) => unknown;
        }>;
    };

    // Relationship management
    relationships: {
        cache: RelationshipCache;
        fetchStrategy: FetchStrategy;
        pendingOperations: Array<{
            type: 'create' | 'update' | 'delete';
            relationshipType: relationships['relationshipType'];
            data: unknown;
        }>;
    };

    // Component and UI state
    components: ComponentState;

    // Validation and error handling
    validation: ValidationState;

    // Enhanced state management
    selection: EnhancedSelectionState<TEntity>;
    pagination: {
        page: number;
        pageSize: number;
        totalCount: number;
        maxCount?: number;
        strategy: 'offset' | 'cursor';
        cursors?: {
            next?: string;
            previous?: string;
        };
    };
    loading: {
        status: 'idle' | 'loading' | 'succeeded' | 'failed';
        initialized: boolean;
        error: { message: string; code?: number } | null;
        pendingOperations: number;
    };
    cache: {
        lastFetched: Record<string, Date>;
        staleTime: number;
        stale: boolean;
        invalidationTriggers: Set<string>;  // Fields/relationships that when changed invalidate cache
    };
    history: {
        past: Array<{
            timestamp: Date;
            operation: 'create' | 'update' | 'delete';
            data: EntityData<TEntity>;
            previousData?: EntityData<TEntity>;
            relationshipChanges?: Record<string, unknown>;
        }>;
        future: Array<any>;
        maxHistorySize: number;
    };
    filters: EnhancedFilterState;

    // Real-time management
    subscription: {
        enabled: boolean;
        events: Array<'INSERT' | 'UPDATE' | 'DELETE'>;
        filters?: Record<string, unknown>;
        relationshipSubscriptions: Record<string, boolean>;
    };
};
*!/
*/
