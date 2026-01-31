// @ts-nocheck

import { DisplayFieldMetadata } from '@/lib/redux/entity/types/stateTypes';
import { AutomationEntities, EntityComponentProps, EntityField, EntityFieldKeys, EntityKeys } from '@/types/entityTypes';
import { FetchStrategy } from '@/types/AutomationSchemaTypes';

type EntityOverrides<TEntity extends EntityKeys> = Partial<{
    displayFieldMetadata?: Partial<DisplayFieldMetadata> | null;
    defaultFetchStrategy?: FetchStrategy | null;
    componentProps?: Partial<EntityComponentProps<TEntity>> | null;
    schemaType?: any | null;
    entityName?: any | null;
    uniqueTableId?: any | null;
    uniqueEntityId?: any | null;
    primaryKey?: any | null;
    primaryKeyMetadata?: any | null;
    entityNameFormats?: any | null;
    relationships?: any | null;
    entityFields?: any | null;
}>;

type FieldOverrides<TEntity extends EntityKeys, TField extends EntityFieldKeys<TEntity>> = Partial<{
    [K in TField]: Partial<EntityField<TEntity, K>>;
}>;

// Entity-level overrides (modular approach)
const brokerEntityOverrides: EntityOverrides<'broker'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: { fieldName: 'displayName', databaseFieldName: 'display_name' },
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};


const actionEntityOverrides: EntityOverrides<'action'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const aiEndpointEntityOverrides: EntityOverrides<'aiEndpoint'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const aiModelEntityOverrides: EntityOverrides<'aiModel'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: { fieldName: 'commonName', databaseFieldName: 'common_name' },
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const aiModelEndpointEntityOverrides: EntityOverrides<'aiModelEndpoint'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const aiProviderEntityOverrides: EntityOverrides<'aiProvider'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const aiSettingsEntityOverrides: EntityOverrides<'aiSettings'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const argEntityOverrides: EntityOverrides<'arg'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const automationBoundaryBrokerEntityOverrides: EntityOverrides<'automationBoundaryBroker'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const automationMatrixEntityOverrides: EntityOverrides<'automationMatrix'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const bucketStructuresEntityOverrides: EntityOverrides<'bucketStructures'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const bucketTreeStructuresEntityOverrides: EntityOverrides<'bucketTreeStructures'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const dataInputComponentEntityOverrides: EntityOverrides<'dataInputComponent'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const dataOutputComponentEntityOverrides: EntityOverrides<'dataOutputComponent'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const displayOptionEntityOverrides: EntityOverrides<'displayOption'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const emailsEntityOverrides: EntityOverrides<'emails'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const extractorEntityOverrides: EntityOverrides<'extractor'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const fileStructureEntityOverrides: EntityOverrides<'fileStructure'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const flashcardDataEntityOverrides: EntityOverrides<'flashcardData'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const flashcardHistoryEntityOverrides: EntityOverrides<'flashcardHistory'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const flashcardImagesEntityOverrides: EntityOverrides<'flashcardImages'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const flashcardSetRelationsEntityOverrides: EntityOverrides<'flashcardSetRelations'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const flashcardSetsEntityOverrides: EntityOverrides<'flashcardSets'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const messageBrokerEntityOverrides: EntityOverrides<'messageBroker'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const messageTemplateEntityOverrides: EntityOverrides<'messageTemplate'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const processorEntityOverrides: EntityOverrides<'processor'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const recipeBrokerEntityOverrides: EntityOverrides<'recipeBroker'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const recipeDisplayEntityOverrides: EntityOverrides<'recipeDisplay'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const recipeFunctionEntityOverrides: EntityOverrides<'recipeFunction'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const recipeModelEntityOverrides: EntityOverrides<'recipeModel'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const recipeProcessorEntityOverrides: EntityOverrides<'recipeProcessor'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const recipeToolEntityOverrides: EntityOverrides<'recipeTool'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const registeredFunctionEntityOverrides: EntityOverrides<'registeredFunction'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const systemFunctionEntityOverrides: EntityOverrides<'systemFunction'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const toolEntityOverrides: EntityOverrides<'tool'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const transformerEntityOverrides: EntityOverrides<'transformer'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
};

const userPreferencesEntityOverrides: EntityOverrides<'userPreferences'> = {
    schemaType: null,
    entityName: null,
    uniqueTableId: null,
    uniqueEntityId: null,
    primaryKey: null,
    primaryKeyMetadata: null,
    displayFieldMetadata: null,
    defaultFetchStrategy: null,
    componentProps: null,
    entityNameFormats: null,
    relationships: null,
    entityFields: null
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
export const ENTITY_OVERRIDES: Partial<Record<EntityKeys, EntityOverrides<EntityKeys>>> = {
    action: actionEntityOverrides,
    aiEndpoint: aiEndpointEntityOverrides,
    aiModel: aiModelEntityOverrides,
    aiModelEndpoint: aiModelEndpointEntityOverrides,
    aiProvider: aiProviderEntityOverrides,
    aiSettings: aiSettingsEntityOverrides,
    arg: argEntityOverrides,
    automationBoundaryBroker: automationBoundaryBrokerEntityOverrides,
    automationMatrix: automationMatrixEntityOverrides,
    broker: brokerEntityOverrides,
    bucketStructures: bucketStructuresEntityOverrides,
    bucketTreeStructures: bucketTreeStructuresEntityOverrides,
    dataInputComponent: dataInputComponentEntityOverrides,
    dataOutputComponent: dataOutputComponentEntityOverrides,
    displayOption: displayOptionEntityOverrides,
    emails: emailsEntityOverrides,
    extractor: extractorEntityOverrides,
    fileStructure: fileStructureEntityOverrides,
    flashcardData: flashcardDataEntityOverrides,
    flashcardHistory: flashcardHistoryEntityOverrides,
    flashcardImages: flashcardImagesEntityOverrides,
    flashcardSetRelations: flashcardSetRelationsEntityOverrides,
    flashcardSets: flashcardSetsEntityOverrides,
    messageBroker: messageBrokerEntityOverrides,
    messageTemplate: messageTemplateEntityOverrides,
    processor: processorEntityOverrides,
    recipe: recipeEntityOverrides,
    recipeBroker: recipeBrokerEntityOverrides,
    recipeDisplay: recipeDisplayEntityOverrides,
    recipeFunction: recipeFunctionEntityOverrides,
    recipeModel: recipeModelEntityOverrides,
    recipeProcessor: recipeProcessorEntityOverrides,
    recipeTool: recipeToolEntityOverrides,
    registeredFunction: registeredFunctionEntityOverrides,
    systemFunction: systemFunctionEntityOverrides,
    tool: toolEntityOverrides,
    transformer: transformerEntityOverrides,
    userPreferences: userPreferencesEntityOverrides
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
