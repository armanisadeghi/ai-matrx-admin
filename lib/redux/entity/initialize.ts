import { AutomationEntity, EntityKeys } from "@/types/entityTypes";
import { EntityMetadata, EntityState, PrimaryKeyMetadata } from "@/lib/redux/entity/types";

function extractFieldsFromSchema<TEntity extends EntityKeys>(
    schema: AutomationEntity<TEntity>,
) {
    if (schema && schema.entityFields) {
        return Object.keys(schema.entityFields).map(key => {
            const field = schema.entityFields[key];
            return {
                name: key,
                displayName: field.fieldNameFormats.pretty,
                isDisplayField: field.isDisplayField || false,
                isPrimary: field.isPrimaryKey || false,
            };
        });
    }
    return [];
}

function createPrimaryKeyMetadata<TEntity extends EntityKeys>(
    schema: AutomationEntity<TEntity>
): PrimaryKeyMetadata {
    // console.log('\nPrimary Key Entry: \n', schema.primaryKey);
    // console.log('\nPrimary Key Metadata: \n', schema.primaryKeyMetadata);
    const primaryKeyFields = schema.primaryKey.split(',').map(key => key.trim());

    return {
        type: primaryKeyFields.length > 1 ? 'composite' : 'single',
        fields: primaryKeyFields,
        database_fields: primaryKeyFields.map(field => {
            const entityField = schema.entityFields[field];
            return entityField.fieldNameFormats.database;
        }),
        where_template: primaryKeyFields.reduce((template, field) => {
            const entityField = schema.entityFields[field];
            template[entityField.fieldNameFormats.database] = null;
            return template;
        }, {} as Record<string, null>)
    };
}

export const initializeEntitySlice = <TEntity extends EntityKeys>(
    entityKey: TEntity,
    schema: AutomationEntity<TEntity>
) => {
    const metadata: EntityMetadata = {
        displayName: schema.entityNameFormats.pretty || entityKey,
        schemaType: schema.schemaType,
        primaryKeyMetadata: createPrimaryKeyMetadata(schema),
        fields: extractFieldsFromSchema(schema),
    };

    const initialState: EntityState<TEntity> = {
        records: {},
        entityMetadata: metadata,
        quickReference: {
            records: [],
            lastUpdated: new Date(),
            totalAvailable: 0,
            fetchComplete: false,
        },
        selection: {
            selectedRecords: new Set(),
            activeRecord: null,
            selectionMode: 'none',
        },
        pagination: {
            page: 1,
            pageSize: 25,
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
            staleTime: 300000, // 5 minutes
            stale: true,
            prefetchedPages: new Set(),
            invalidationTriggers: new Set(),
        },
        history: {
            past: [],
            future: [],
            maxHistorySize: 50,
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
    };

    return { metadata, initialState };
};
