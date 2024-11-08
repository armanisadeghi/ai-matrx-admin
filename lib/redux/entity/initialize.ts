import { AutomationEntity, EntityField, EntityKeys } from "@/types/entityTypes";
import { EntityMetadata, EntityMetrics, EntityState, PrimaryKeyMetadata } from "@/lib/redux/entity/types";
import EntityLogger from "@/lib/redux/entity/entityLogger";

/**
 * Represents the structure we expect for each field in the schema
 */
interface SchemaField {
    fieldNameFormats: {
        pretty: string;
        [key: string]: string;
    };
    isDisplayField?: boolean;
    isPrimaryKey?: boolean;
}

/**
 * Type guard to ensure a field has the required properties
 */
function isValidSchemaField(field: unknown): field is SchemaField {
    const f = field as SchemaField;
    return (
        f !== null &&
        typeof f === 'object' &&
        'fieldNameFormats' in f &&
        typeof f.fieldNameFormats?.pretty === 'string'
    );
}

// Configuration Constants
const ENTITY_DEFAULTS = {
    CACHE: {
        STALE_TIME: 300000,
        MAX_HISTORY: 50
    },
    PAGINATION: {
        PAGE_SIZE: 25
    },
    SUBSCRIPTION: {
        DEBOUNCE_MS: 1000
    }
} as const;

// Utility Functions
const getCurrentISODate = () => new Date().toISOString();

/**
 * Simplified field extraction that maintains type safety
 */
function extractFieldsFromSchema<TEntity extends EntityKeys>(
    schema: AutomationEntity<TEntity>
) {
    if (!schema?.entityFields) {
        console.warn('No entityFields found in schema');
        return [];
    }

    return Object.entries(schema.entityFields).map(([key, field]) => {
        if (!isValidSchemaField(field)) {
            console.warn(`Field ${key} does not have expected structure`);
            return {
                name: key,
                displayName: key,
                isDisplayField: false,
                isPrimary: false,
            };
        }

        return {
            name: key,
            displayName: field.fieldNameFormats.pretty,
            isDisplayField: field.isDisplayField || false,
            isPrimary: field.isPrimaryKey || false,
        };
    });
}

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
    primaryKeyFields.forEach(field => {
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
        EntityLogger.log('debug', 'Primary Key Configuration', 'entityKey', {
            fields: pkMetadata.fields,
            databaseFields: pkMetadata.database_fields,
            template: pkMetadata.where_template
        });
    }
    // console.log('pkMetadata:', pkMetadata);
    return pkMetadata;
}

// Initial Metrics State
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

function createInitialState<TEntity extends EntityKeys>(
    metadata: EntityMetadata
): EntityState<TEntity> {
    return {
        records: {},
        entityMetadata: metadata,
        quickReference: {
            records: [],
            lastUpdated: getCurrentISODate(),
            totalAvailable: 0,
            fetchComplete: false,
        },
        selection: {
            selectedRecords: [],  // Initialize as empty array
            activeRecord: null,
            selectionMode: 'none',
        },
        pagination: {
            page: 1,
            pageSize: ENTITY_DEFAULTS.PAGINATION.PAGE_SIZE,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
        },
        loading: {
            loading: false,
            initialized: false,
            error: null,
            lastOperation: null
        },
        cache: {
            lastFetched: {},
            staleTime: ENTITY_DEFAULTS.CACHE.STALE_TIME,
            stale: true,
            prefetchedPages: [],  // Initialize as empty array
            invalidationTriggers: [],  // Initialize as empty array
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
        },
        metrics: initialMetricsState
    };
}

export const initializeEntitySlice = <TEntity extends EntityKeys>(
    entityKey: TEntity,
    schema: AutomationEntity<TEntity>
) => {
    if (!schema) {
        throw new Error(`Schema not provided for entity: ${entityKey}`);
    }

    const metadata: EntityMetadata = {
        displayName: schema.entityNameFormats.pretty || entityKey,
        schemaType: schema.schemaType,
        primaryKeyMetadata: createPrimaryKeyMetadata(schema),
        displayFieldMetadata: schema.displayFieldMetadata,
        fields: extractFieldsFromSchema(schema),
    };

    return {
        metadata,
        initialState: createInitialState<TEntity>(metadata)
    };
};

// Export configuration constants for use in other files
export { ENTITY_DEFAULTS };


const emptyMetricsState: EntityMetrics = {
    operationCounts: { creates: 0, updates: 0, deletes: 0, timeline: [] },
    performanceMetrics: { responseTimes: [], throughput: [] },
    cacheStats: {
        hitRate: [],
        size: [],
        totalHits: 0,
        totalMisses: 0,
        evictions: 0,
        memoryUsage: '0 MB'
    },
    errorRates: { timeline: [], distribution: [], recent: [] },
    lastUpdated: getCurrentISODate(),
};

// Define an empty entity state as a constant
export const createEmptyEntityState = <TEntity extends EntityKeys>(): EntityState<TEntity> => ({
    records: {},  // Empty records
    entityMetadata: {
        displayName: "",
        schemaType: "",  // Adjust type according to your expected schema type, if needed
        primaryKeyMetadata: {
            type: "single",  // Placeholder primary key type
            fields: [],
            database_fields: [],
            where_template: {}
        },
        fields: []
    } as EntityMetadata,
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
    },
    pagination: {
        page: 1,
        pageSize: 25,  // Use the default page size here, or adjust as needed
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    },
    loading: {
        loading: false,
        initialized: false,
        error: null,
        lastOperation: null
    },
    cache: {
        lastFetched: {},
        staleTime: 300000,  // Default stale time from ENTITY_DEFAULTS
        stale: true,
        prefetchedPages: [],
        invalidationTriggers: []
    },
    history: {
        past: [],
        future: [],
        maxHistorySize: 50  // Max history size from ENTITY_DEFAULTS
    },
    filters: {
        conditions: [],
        sort: [],
    },
    subscription: {
        enabled: true,
        events: ['INSERT', 'UPDATE', 'DELETE'],
        debounceMs: 1000,
        batchUpdates: true,
    },
    flags: {
        needsRefresh: true,
        isModified: false,
        hasUnsavedChanges: false,
        isBatchOperationInProgress: false,
    },
    metrics: emptyMetricsState
});
