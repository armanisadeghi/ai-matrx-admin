import { DisplayFieldMetadata } from '@/lib/redux/entity/types/stateTypes';
import { AutomationEntities, EntityComponentProps, EntityField, EntityFieldKeys, EntityKeys, FetchStrategy } from '@/types';

type EntityOverrides<TEntity extends EntityKeys> = Partial<{
    displayFieldMetadata?: Partial<DisplayFieldMetadata>;
    defaultFetchStrategy?: FetchStrategy;
    componentProps?: Partial<EntityComponentProps<TEntity>>;
}>;

type FieldOverrides<TEntity extends EntityKeys, TField extends EntityFieldKeys<TEntity>> = Partial<{
    [K in TField]: Partial<EntityField<TEntity, K>>;
}>;

// Entity-level overrides (modular approach)
const brokerEntityOverrides: EntityOverrides<'broker'> = {
    displayFieldMetadata: { fieldName: 'displayName', databaseFieldName: 'display_name' },
};

const recipeEntityOverrides: EntityOverrides<'recipe'> = {
    defaultFetchStrategy: 'fkAndIfk',
};

// Field-level overrides (modular approach)
const brokerFieldOverrides: FieldOverrides<'broker', EntityFieldKeys<'broker'>> = {
    name: { isDisplayField: false },
    displayName: { isDisplayField: true },
};

// Combine dynamically
const ENTITY_OVERRIDES: Partial<Record<EntityKeys, EntityOverrides<EntityKeys>>> = {
    broker: brokerEntityOverrides,
    recipe: recipeEntityOverrides,
};

const FIELD_OVERRIDES: Partial<Record<EntityKeys, FieldOverrides<EntityKeys, EntityFieldKeys<EntityKeys>>>> = {
    broker: brokerFieldOverrides,
};


function addEntityOverride<TEntity extends EntityKeys>(
    overrides: Partial<Record<TEntity, EntityOverrides<TEntity>>>,
    entity: TEntity,
    entityOverride: EntityOverrides<TEntity>
) {
    overrides[entity] = {
        ...overrides[entity],
        ...entityOverride,
    };
}

function addFieldOverride<TEntity extends EntityKeys>(
    overrides: Partial<Record<TEntity, FieldOverrides<TEntity, EntityFieldKeys<TEntity>>>>,
    entity: TEntity,
    fieldName: EntityFieldKeys<TEntity>,
    fieldOverride: Partial<EntityField<TEntity, typeof fieldName>>
) {
    if (!overrides[entity]) {
        overrides[entity] = {} as FieldOverrides<TEntity, EntityFieldKeys<TEntity>>;
    }
    overrides[entity]![fieldName] = {
        ...overrides[entity]![fieldName],
        ...fieldOverride,
    };
}


function applyEntityOverrides<TEntity extends EntityKeys>(
    schema: AutomationEntities,
    entityOverrides: Partial<Record<TEntity, EntityOverrides<TEntity>>>
): AutomationEntities {
    Object.entries(entityOverrides).forEach(([entityName, overrides]) => {
        const typedEntityName = entityName as TEntity;

        const currentEntity = schema[typedEntityName];
        if (currentEntity && overrides) {
            const typedOverrides = overrides as EntityOverrides<TEntity>;

            schema[typedEntityName] = {
                ...currentEntity,
                ...typedOverrides,
                displayFieldMetadata: {
                    ...(currentEntity.displayFieldMetadata || {}),
                    ...(typedOverrides.displayFieldMetadata || {}),
                },
                componentProps: {
                    ...(currentEntity.componentProps || {}),
                    ...(typedOverrides.componentProps || {}),
                },
            };
        }
    });
    return schema;
}

function applyFieldOverrides<TEntity extends EntityKeys>(
    schema: AutomationEntities,
    fieldOverrides: Partial<Record<TEntity, FieldOverrides<TEntity, EntityFieldKeys<TEntity>>>>
): AutomationEntities {
    Object.entries(fieldOverrides).forEach(([entityName, fields]) => {
        const typedEntityName = entityName as TEntity;

        if (schema[typedEntityName] && fields) {
            Object.entries(fields).forEach(([fieldName, fieldOverrides]) => {
                const typedFieldName = fieldName as EntityFieldKeys<TEntity>;

                if (schema[typedEntityName].entityFields[typedFieldName]) {
                    const currentField = schema[typedEntityName].entityFields[typedFieldName];
                    schema[typedEntityName].entityFields[typedFieldName] = {
                        ...currentField,
                        ...fieldOverrides,
                    };
                }
            });
        }
    });
    return schema;
}

/*
export function initializeSchemaSystem<TEntity extends EntityKeys>(
    trace: string[] = ['unknownCaller']
): UnifiedSchemaCache {
    trace = [...trace, 'initializeSchemaSystem'];

    if (globalCache) {
        return globalCache;
    }

    try {
        // Compute the schema as before
        const processedSchema: Partial<AutomationEntities> = { ... }; // Same as before

        // Apply overrides
        const schemaWithEntityOverrides = applyEntityOverrides(
            processedSchema as AutomationEntities,
            ENTITY_OVERRIDES
        );

        const schemaWithAllOverrides = applyFieldOverrides(
            schemaWithEntityOverrides,
            FIELD_OVERRIDES
        );

        globalCache = {
            ...globalCache,
            schema: schemaWithAllOverrides as AutomationEntities,
        };

        return globalCache;
    } catch (error) {
        // Handle error
        throw error;
    }
}
*/
