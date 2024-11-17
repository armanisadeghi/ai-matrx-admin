// lib/redux/entity/types.ts

import {DataStructure, FieldDataOptionsType} from "@/types/AutomationSchemaTypes";


import {
    EntityKeys,
    EntityData,
    AllEntityFieldKeys,
    AnyEntityDatabaseTable,
    Relationship,
    AutomationEntity
} from "@/types/entityTypes";
import {TypeBrand} from "@/utils/schema/initialSchemas";

// --- Basic Types ---
export type MatrxRecordId = string;
export type EntityRecord<TEntity extends EntityKeys> = EntityData<TEntity>;
export type EntityRecordMap<TEntity extends EntityKeys> = Record<MatrxRecordId, EntityData<TEntity>>;
export type EntityRecordArray<TEntity extends EntityKeys> = EntityData<TEntity>[];

export type SuccessResult = { status: "success"; data: void };
export type ErrorResult = { status: "error"; error: any };
export type CallbackResult = SuccessResult | ErrorResult;
export type OperationCallback<T = void> = {
    onSuccess?: (result: SuccessResult) => void;
    onError?: (error: ErrorResult) => void;
};


type PrimaryKeyType = 'single' | 'composite' | 'none';

export interface PrimaryKeyMetadata {
    type: PrimaryKeyType;
    fields: AllEntityFieldKeys[];
    database_fields: string[];
    where_template: Record<string, null>;
}

export interface DisplayFieldMetadata {
    fieldName: AllEntityFieldKeys | null;
    databaseFieldName: string | null;
}

export interface EntityStateField {
    name: AllEntityFieldKeys;
    displayName: string;
    isPrimaryKey: boolean;
    isDisplayField?: boolean;

    enumValues: string[];
    defaultValue: any;
    defaultGeneratorFunction: string;


    dataType: FieldDataOptionsType;

    isArray: boolean;

    structure: DataStructure;

    isNative: boolean;

    defaultComponent?: string;
    componentProps: ComponentProps;

    isRequired: boolean;
    maxLength: number;
    validationFunctions: string[];
    exclusionRules: string[];

    entityName: EntityKeys;
    databaseTable: AnyEntityDatabaseTable;
    description: string;
    typeReference: TypeBrand<any>;
}

export interface EntityStateFieldWithValue extends EntityStateField {
    value: any;
}

export type ExtractType<T> = T extends TypeBrand<infer U> ? U : T;

export interface EntityStateFieldWithValueComplex extends EntityStateField {
    value: ExtractType<this['typeReference']>;
}

export type EntityFieldWithValue<TEntity extends EntityKeys> = {
    [TField in keyof AutomationEntity<TEntity>['entityFields']]: Omit<AutomationEntity<TEntity>['entityFields'][TField], 'typeReference'> & {
    typeReference: AutomationEntity<TEntity>['entityFields'][TField]['typeReference'];
    value: ExtractType<AutomationEntity<TEntity>['entityFields'][TField]['typeReference']>;
};
};

type MyEntityFieldWithValues = EntityFieldWithValue<"registeredFunction">;
type ModulePathField = EntityFieldWithValue<"registeredFunction">['modulePath'];
type argInverseField = EntityFieldWithValue<"registeredFunction">['argInverse'];


export interface EntityMetadata {
    displayName: string;
    schemaType: string;
    primaryKeyMetadata: PrimaryKeyMetadata;
    displayFieldMetadata: DisplayFieldMetadata;
    displayField?: string;
    fields: EntityStateField[];
    relationships: Relationship[];
}

export type ComponentProps = {
    variant: string;
    placeholder: string;
    size: string;
    textSize: string;
    textColor: string;
    rows: string;
    animation: string;
    fullWidthValue: string;
    fullWidth: string;
    disabled: string;
    className: string;
    type: string;
    onChange: string;
    formatString: string;
    minDate: string;
    maxDate: string;
    [key: string]: string;
};

// --- Pagination State ---
export interface PaginationState {
    pageIndex: number;
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    maxCount?: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}


// --- Cache Management ---
export interface CacheState {
    lastFetched: Record<string, string>;  // dates as ISO strings
    staleTime: number;
    stale: boolean;
    prefetchedPages: number[];  // Changed from Set<number> to number[]
    invalidationTriggers: string[];  // Changed from Set<string> to string[]
}


// --- Quick Reference Cache ---
export interface QuickReferenceRecord {
    recordKey: MatrxRecordId;
    primaryKeyValues: Record<AllEntityFieldKeys, any>;
    displayValue: string;
    metadata?: {
        lastModified?: string;
        createdBy?: string;
        status?: string;
    };
}

export interface QuickReferenceState {
    records: QuickReferenceRecord[];
    lastUpdated: string;
    totalAvailable: number;
    fetchComplete: boolean;
}


// --- History Management ---
export interface HistoryEntry<TEntity extends EntityKeys> {
    timestamp: string;
    operation: 'create' | 'update' | 'delete' | 'bulk';
    data: EntityRecord<TEntity> | EntityRecordArray<TEntity>;
    previousData?: EntityRecord<TEntity> | EntityRecordArray<TEntity>;
    metadata?: {
        user?: string;
        reason?: string;
        batchId?: string;
        primaryKeyValues?: Record<string, MatrxRecordId>;
    };
}


export interface HistoryState<TEntity extends EntityKeys> {
    past: HistoryEntry<TEntity>[];
    future: HistoryEntry<TEntity>[];
    maxHistorySize: number;
    lastSaved?: string;
}

// --- Query and Filter Types ---
type ComparisonOperator =
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'like'
    | 'ilike'
    | 'in'
    | 'between';

export interface FilterCondition {
    field: string;
    operator: ComparisonOperator;
    value: unknown;
    or?: FilterCondition[];
    and?: FilterCondition[];
}

export interface FilterState {
    conditions: FilterCondition[];
    sort: Array<{
        field: string;
        direction: 'asc' | 'desc';
    }>;
    search?: string;
    savedFilters?: Record<string, FilterCondition[]>;
}

export interface FilterPayload {
    conditions: FilterCondition[];
    replace?: boolean;
    temporary?: boolean;
}

export interface SortPayload {
    field: string;
    direction: 'asc' | 'desc';
    append?: boolean;
}

export interface SubscriptionConfig {
    enabled: boolean;
    events: Array<'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE'>;
    filters?: FilterCondition[];
    debounceMs?: number;
    batchUpdates?: boolean;
}


export interface SelectionSummary {
    count: number;
    hasSelection: boolean;
    hasSingleSelection: boolean;
    hasMultipleSelection: boolean;
    activeRecord: MatrxRecordId | null;
    mode: SelectionMode;
}

export type SelectionMode = 'single' | 'multiple' | 'none';

// --- Selection Management ---
export interface SelectionState {
    selectedRecords: MatrxRecordId[];
    selectionMode: SelectionMode;
    activeRecord: MatrxRecordId | null;
    lastActiveRecord?: MatrxRecordId | null;
    lastSelected?: MatrxRecordId;
}


// --- Main Slice State ---
export interface EntityState<TEntity extends EntityKeys> {
    entityMetadata: EntityMetadata;  // Field info is here: entityMetadata.fields has this: EntityStateField[]
    records: Record<MatrxRecordId, EntityData<TEntity>>;   // Data is here
    quickReference: QuickReferenceState;  // Quick reference data is here
    selection: SelectionState;
    pagination: PaginationState;
    loading: LoadingState;
    cache: CacheState;
    history: HistoryState<TEntity>;
    filters: FilterState;
    subscription: SubscriptionConfig;
    flags: EntityFlags;
    metrics: EntityMetrics;
}

export type FlagStatusOptions = 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';

export type EntityOperations =
    | 'FETCH'
    | 'FETCH_ONE'
    | 'FETCH_QUICK_REFERENCE'
    | 'FETCH_RECORDS'
    | 'FETCH_ALL'
    | 'FETCH_PAGINATED'
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'CUSTOM';

export interface EntityOperationFlags {
    FETCH_STATUS?: FlagStatusOptions;
    FETCH_ONE_STATUS?: FlagStatusOptions;
    FETCH_QUICK_REFERENCE_STATUS?: FlagStatusOptions;
    FETCH_RECORDS_STATUS?: FlagStatusOptions;
    FETCH_ALL_STATUS?: FlagStatusOptions;
    FETCH_PAGINATED_STATUS?: FlagStatusOptions;
    CREATE_STATUS?: FlagStatusOptions;
    UPDATE_STATUS?: FlagStatusOptions;
    DELETE_STATUS?: FlagStatusOptions;
    CUSTOM_STATUS?: FlagStatusOptions;
}

export interface EntityFlags {
    needsRefresh?: boolean;
    isModified?: boolean;
    hasUnsavedChanges?: boolean;
    isBatchOperationInProgress?: boolean;
    isValidated?: boolean;
    operationFlags: EntityOperationFlags;
}

export interface LoadingState {
    initialized: boolean;
    loading: boolean;
    error: {
        message: string;
        code?: number;
        details?: unknown;
    } | null;
    lastOperation?: EntityOperations;
}

export interface EntityError {
    message: string;
    code?: number;
    details?: unknown;
    lastOperation?: EntityOperations;
}


export interface RecordOperation<TEntity extends EntityKeys> {
    primaryKeyMetadata: PrimaryKeyMetadata;
    record: EntityRecord<TEntity>;
}

export interface BatchOperationPayload<TEntity extends EntityKeys> {
    operation: 'create' | 'update' | 'delete';
    records: EntityRecordArray<TEntity>;
    primaryKeyMetadata: PrimaryKeyMetadata;
    options?: {
        skipHistory?: boolean;
        batchSize?: number;
        onProgress?: (progress: number) => void;
    };
}

// Add these interfaces to your types file
export interface EntityMetrics {
    operationCounts: {
        creates: number;
        updates: number;
        deletes: number;
        timeline: Array<{
            timestamp: string;
            creates: number;
            updates: number;
            deletes: number;
        }>;
    };
    performanceMetrics: {
        responseTimes: Array<{
            timestamp: string;
            avgResponseTime: number;
            p95ResponseTime: number;
        }>;
        throughput: Array<{
            timestamp: string;
            reads: number;
            writes: number;
        }>;
    };
    cacheStats: {
        hitRate: Array<{
            timestamp: string;
            hitRate: number;
        }>;
        size: Array<{
            timestamp: string;
            size: number;
        }>;
        totalHits: number;
        totalMisses: number;
        evictions: number;
        memoryUsage: string;
    };
    errorRates: {
        timeline: Array<{
            timestamp: string;
            errorRate: number;
        }>;
        distribution: Array<{
            errorType: string;
            count: number;
        }>;
        recent: Array<{
            timestamp: string;
            type: string;
            message: string;
            details?: any;
        }>;
    };
    lastUpdated: string;
}

// records: Record<MatrxRecordId, EntityData<TEntity>>; Changed from MatrxRecordId to string for consistent serialization (Back to MatrxRecordId as string)

interface combinedQuickReferenceState {
    records: {
        primaryKeyValues: Record<string, MatrxRecordId>;
        displayValue: string;
        metadata?: {
            lastModified?: string;
            createdBy?: string;
            status?: string;
        };
    }[];
    lastUpdated: string;
    totalAvailable: number;
    fetchComplete: boolean;
}

interface CombinedEntityMetadata {
    displayName: string;
    schemaType: string;
    primaryKeyMetadata: {
        type: 'single' | 'composite' | 'none';
        fields: string[];
        database_fields: string[];
        where_template: Record<string, null>;
    };
    DisplayFieldMetadata: {
        fieldName: string;
        databaseFieldName: string;
    }
    displayField?: string;
    fields: {
        name: string;
        displayName: string;
        isPrimaryKey: boolean;
        isDisplayField: boolean;
        dataType: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null' | 'undefined' | 'any' | 'function' | 'date';
        isArray: boolean;
        structure: 'single' | 'array' | 'object' | 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
        isNative: boolean;
        defaultComponent: string | null;
        componentProps: Record<string, unknown>;
        isRequired: boolean;
        maxLength: number | null;
        defaultValue: any;
        defaultGeneratorFunction: string | null;
        validationFunctions: string[] | null;
        exclusionRules: string[] | null;
        databaseTable: string | null;
    }[];
}

interface SimplifiedEntityState {
    records: Record<MatrxRecordId, Record<string, unknown>>;

    quickReference: {
        records: {
            primaryKeyValues: Record<string, MatrxRecordId>;
            displayValue: string;
            recordKey: string;
            metadata?: {
                lastModified?: string;
                createdBy?: string;
                status?: string;
            };
        }[];
        lastUpdated: string;
        totalAvailable: number;
        fetchComplete: boolean;
    };

    selection: {
        selectedRecords: MatrxRecordId[];
        selectionMode: 'single' | 'multiple' | 'none';
        activeRecord: Record<string, unknown> | null;
        lastSelected?: MatrxRecordId;
    }

    entityMetadata: {
        displayName: string;
        schemaType: string;
        primaryKeyMetadata: {
            type: 'single' | 'composite' | 'none';
            fields: string[];
            database_fields: string[];
            where_template: Record<string, null>;
        };
        DisplayFieldMetadata: {
            fieldName: string;
            databaseFieldName: string;
        }
        displayField?: string;
        fields: {
            name: string;
            displayName: string;
            isPrimaryKey: boolean;
            isDisplayField: boolean;
            dataType: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null' | 'undefined' | 'any' | 'function' | 'date';
            isArray: boolean;
            structure: 'single' | 'array' | 'object' | 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
            isNative: boolean;
            defaultComponent: string | null;
            componentProps: Record<string, unknown>;
            isRequired: boolean;
            maxLength: number | null;
            defaultValue: any;
            defaultGeneratorFunction: string | null;
            validationFunctions: string[] | null;
            exclusionRules: string[] | null;
            databaseTable: string | null;
            entityName: string;
        }[];
    };
}

