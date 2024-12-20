import {AllEntityFieldKeys, AutomationEntity, EntityField, EntityKeys} from "@/types/entityTypes";
import {EntityMetadata, EntityMetrics, EntityState, EntityStateField} from "@/lib/redux/entity/types/stateTypes";
import EntityLogger from "@/lib/redux/entity/utils/entityLogger";
import {TypeBrand} from "@/utils/schema/initialSchemas";


// Configuration Constants
export const ENTITY_DEFAULTS = {
    CACHE: {
        STALE_TIME: 300000,
        MAX_HISTORY: 50
    },
    PAGINATION: {
        PAGE_SIZE: 25
    },
    SUBSCRIPTION: {
        DEBOUNCE_MS: 1000
    },
    OPERATION_FLAGS: {
        FETCH_STATUS: 'IDLE',
        FETCH_ONE_STATUS: 'IDLE',
        FETCH_QUICK_REFERENCE_STATUS: 'IDLE',
        FETCH_RECORDS_STATUS: 'IDLE',
        FETCH_ALL_STATUS: 'IDLE',
        FETCH_PAGINATED_STATUS: 'IDLE',
        CREATE_STATUS: 'IDLE',
        UPDATE_STATUS: 'IDLE',
        DELETE_STATUS: 'IDLE',
        CUSTOM_STATUS: 'IDLE',
        FETCH_ONE_WITH_FK_IFK_STATUS: 'IDLE',
        FETCHED_AS_RELATED_STATUS: 'IDLE',

    },
    OPERATION_MODE : 'view'
} as const;



const trace = "INITIALIZATION";
const entityLogger = EntityLogger.createLoggerWithDefaults(trace, 'NoEntity');

// Utility Functions
const getCurrentISODate = () => new Date().toISOString();

/**
 * Type guard to ensure a field has the required properties
 */
function isValidSchemaField(field: unknown): field is EntityField<any, any> {
    const f = field as EntityField<any, any>;
    return (
        f !== null &&
        typeof f === 'object' &&
        'fieldNameFormats' in f &&
        typeof f.fieldNameFormats?.pretty === 'string'
    );
}

const DEFAULT_FIELD_VALUES = {
    displayName: (key: string) => key,
    uniqueColumnId: (key: string) => key,
    uniqueFieldId: (key: string) => key,
    dataType: 'string',
    isRequired: false,
    maxLength: null,
    isArray: false,
    defaultValue: "",
    isPrimaryKey: false,
    isDisplayField: false,
    defaultGeneratorFunction: null,
    validationFunctions: null,
    exclusionRules: null,
    defaultComponent: 'INPUT',
    componentProps: {
        "subComponent": "default",
    },
    structure: 'single',
    isNative: true,
    typeReference: {} as TypeBrand<string>,
    enumValues: null,
    databaseTable: null,
    foreignKeyReference: {},
    description: "",
} as const;

/**
 * Simplified field extraction that maintains type safety
 */
export function extractFieldsFromSchema<TEntity extends EntityKeys>(
    schema: AutomationEntity<TEntity>,
    entityKey: EntityKeys,
) {
    if (!schema?.entityFields) {
        console.warn('No entityFields found in schema');
        return [];
    }

    return Object.entries(schema.entityFields).map(([key, field]) => {
        if (!isValidSchemaField(field)) {
            console.warn(`Field ${key} does not have expected structure`);
            return {
                name: key as AllEntityFieldKeys,
                entityName: entityKey,
                ...Object.fromEntries(
                    Object.entries(DEFAULT_FIELD_VALUES).map(([key, value]) => [
                        key,
                        typeof value === 'function' ? value(key) : value
                    ])
                ),
            };
        }

        return {
            name: key as AllEntityFieldKeys,
            displayName: field.fieldNameFormats.pretty,
            entityName: entityKey,
            ...field,
        } as EntityStateField;
    });
}



const initialMetricsState: EntityMetrics = {
    operationCounts: {
        creates: 0,
        updates: 0,
        deletes: 0,
        timeline: []
    },
    performanceMetrics: {
        responseTimes: [],
        throughput: []
    },
    cacheStats: {
        hitRate: [],
        size: [],
        totalHits: 0,
        totalMisses: 0,
        evictions: 0,
        memoryUsage: '0 MB'
    },
    errorRates: {
        timeline: [],
        distribution: [],
        recent: []
    },
    lastUpdated: getCurrentISODate()
};

export function createInitialState<TEntity extends EntityKeys>(
    metadata: EntityMetadata
): EntityState<TEntity> {
    return {
        records: {},
        entityMetadata: metadata,
        unsavedRecords: {},
        pendingOperations: [],
        quickReference: {
            records: [],
            lastUpdated: getCurrentISODate(),
            totalAvailable: 0,
            fetchComplete: false,
        },
        selection: {
            selectedRecords: [],
            activeRecord: null,
            selectionMode: 'none',
            lastActiveRecord: null,
            lastSelected: null,
        },
        pagination: {
            page: 1,
            pageSize: ENTITY_DEFAULTS.PAGINATION.PAGE_SIZE,
            totalCount: 0,
            totalPages: 0,
            pageIndex: 0,
            hasNextPage: false,
            hasPreviousPage: false,
        },
        loading: {
            loading: false,
            initialized: true,
            error: null,
            lastOperation: null
        },
        cache: {
            lastFetched: {},
            staleTime: ENTITY_DEFAULTS.CACHE.STALE_TIME,
            stale: true,
            prefetchedPages: [],
            invalidationTriggers: [],
        },
        history: {
            past: [],
            future: [],
            maxHistorySize: ENTITY_DEFAULTS.CACHE.MAX_HISTORY
        },
        filters: {
            conditions: [],
            sort: [],
        },
        subscription: {
            enabled: true,
            events: ['INSERT', 'UPDATE', 'DELETE'],
            debounceMs: ENTITY_DEFAULTS.SUBSCRIPTION.DEBOUNCE_MS,
            batchUpdates: true,
        },
        flags: {
            needsRefresh: true,
            isModified: false,
            hasUnsavedChanges: false,
            isBatchOperationInProgress: false,
            operationMode: ENTITY_DEFAULTS.OPERATION_MODE,
            operationFlags: ENTITY_DEFAULTS.OPERATION_FLAGS,
        },
        metrics: initialMetricsState
    };
}




const emptyMetricsState: EntityMetrics = {
    operationCounts: {creates: 0, updates: 0, deletes: 0, timeline: []},
    performanceMetrics: {responseTimes: [], throughput: []},
    cacheStats: {
        hitRate: [],
        size: [],
        totalHits: 0,
        totalMisses: 0,
        evictions: 0,
        memoryUsage: '0 MB'
    },
    errorRates: {timeline: [], distribution: [], recent: []},
    lastUpdated: getCurrentISODate(),
};





/*
// TODO: If this is being used, it's redundant because the schema already has this information
function createPrimaryKeyMetadata<TEntity extends EntityKeys>(
    schema: AutomationEntity<TEntity>
): PrimaryKeyMetadata {
    // console.log('schema.primaryKeyMetadata:', schema.primaryKeyMetadata);

    const primaryKeyFields = schema.primaryKey.split(',').map(key => key.trim());
    const pkMetadata: PrimaryKeyMetadata = {
        type: primaryKeyFields.length > 1 ? 'composite' : 'single',
        fields: [],
        database_fields: [],
        where_template: {}
    };

    // Single pass through primary key fields for efficiency
    primaryKeyFields.forEach((field: keyof typeof schema.entityFields) => {
        const entityField = schema.entityFields[field];
        if (!entityField) {
            console.error(`Primary key field ${field} not found in schema`);
            return;
        }

        pkMetadata.fields.push(field);
        pkMetadata.database_fields.push(entityField.fieldNameFormats.database);
        pkMetadata.where_template[entityField.fieldNameFormats.database] = null;
    });


    if (process.env.NODE_ENV === 'development') {
        entityLogger.log('debug', 'createPrimaryKeyMetadata - Primary Key Configuration', {
            fields: pkMetadata.fields,
            databaseFields: pkMetadata.database_fields,
            template: pkMetadata.where_template
        });
    }
    // console.log('pkMetadata:', pkMetadata);
    return pkMetadata;
}

*/
