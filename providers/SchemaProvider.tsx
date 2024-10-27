import {createContext, useContext, useRef} from 'react';
import {v4 as uuidv4} from 'uuid';
import {
    AllEntityNameVariations, AllFieldNameVariations, assertFormat,
    AutomationEntity, createFormattedRecord,
    DataFormat, DefaultGenerators, EntityField, EntityFieldKeys,
    EntityKeys, EntityNameFormat, EntityRecord, FieldNameFormat, FieldNameFormats, FormattedEntitySchema,
    UnifiedSchemaCache
} from "@/types/entityTypes";

type SchemaContextType = UnifiedSchemaCache;

const SchemaContext = createContext<SchemaContextType | null>(null);

interface SchemaProviderProps {
    children: React.ReactNode;
    initialSchema: SchemaContextType;
}

export function SchemaProvider({children, initialSchema}: SchemaProviderProps) {
    const schemaRef = useRef<SchemaContextType>(initialSchema);

    if (!initialSchema) {
        throw new Error('Schema must be provided to SchemaProvider');
    }

    return (
        <SchemaContext.Provider value={schemaRef.current}>
            {children}
        </SchemaContext.Provider>
    );
}

export function useSchema() {
    const context = useContext(SchemaContext);
    if (!context) {
        throw new Error('useSchema must be used within a SchemaProvider');
    }
    return context;
}


export function useSchemaResolution() {
    const {
        schema,
        entityNameToCanonical,
        fieldNameToCanonical,
        entityNameFormats,
        fieldNameFormats
    } = useSchema();

    /**
     * Resolves any entity name variation to its canonical key
     */
    const resolveEntityKey = (entityVariant: AllEntityNameVariations): EntityKeys => {
        if (!(entityVariant in entityNameToCanonical)) {
            throw new Error(`Invalid entity name: ${entityVariant}`);
        }
        return entityNameToCanonical[entityVariant];
    };

    /**
     * Gets the complete entity schema for a given entity variation
     */
    const getEntitySchema = <TEntity extends EntityKeys>(
        entityVariant: AllEntityNameVariations
    ): AutomationEntity<TEntity> => {
        const entityKey = resolveEntityKey(entityVariant);
        const entitySchema = schema[entityKey] as AutomationEntity<TEntity>;
        if (!entitySchema) {
            throw new Error(`No entity found for key: ${entityKey}`);
        }
        return entitySchema;
    };

    /**
     * Gets an entity name in a specific format
     */
    const getEntityNameInFormat = <
        TEntity extends EntityKeys,
        TFormat extends DataFormat
    >(
        entityKey: TEntity,
        format: TFormat
    ): EntityNameFormat<TEntity, TFormat> => {
        if (
            !(entityKey in entityNameFormats) ||
            !(format in entityNameFormats[entityKey])
        ) {
            throw new Error(`Invalid entity key or format: ${entityKey}, ${format}`);
        }
        return entityNameFormats[entityKey][format] as EntityNameFormat<TEntity, TFormat>;
    };

    /**
     * Resolves any entity name variation to a specific format
     */
    const resolveEntityNameInFormat = <
        TEntity extends EntityKeys,
        TFormat extends DataFormat
    >(
        entityVariant: AllEntityNameVariations,
        format: TFormat
    ): EntityNameFormat<TEntity, TFormat> => {
        const entityKey = resolveEntityKey(entityVariant) as TEntity;
        return getEntityNameInFormat(entityKey, format);
    };

    /**
     * Resolves any field name variation to its canonical key
     */
    const resolveFieldKey = <TEntity extends EntityKeys>(
        entityKey: TEntity,
        fieldVariant: AllFieldNameVariations<TEntity, EntityFieldKeys<TEntity>>
    ): EntityFieldKeys<TEntity> => {
        if (
            !(entityKey in fieldNameToCanonical) ||
            !(fieldVariant in fieldNameToCanonical[entityKey])
        ) {
            throw new Error(`Invalid entity key or field name: ${entityKey}, ${fieldVariant}`);
        }
        return fieldNameToCanonical[entityKey][fieldVariant] as EntityFieldKeys<TEntity>;
    };

    /**
     * Resolves both entity and field variations to their canonical keys
     */
    const resolveEntityAndFieldKeys = <TEntity extends EntityKeys>(
        entityVariant: AllEntityNameVariations,
        fieldVariant: AllFieldNameVariations<TEntity, EntityFieldKeys<TEntity>>
    ): {
        entityKey: TEntity;
        fieldKey: EntityFieldKeys<TEntity>;
    } => {
        const entityKey = resolveEntityKey(entityVariant) as TEntity;
        const fieldKey = resolveFieldKey(entityKey, fieldVariant);
        return {entityKey, fieldKey};
    };

    /**
     * Gets a field name in a specific format using canonical keys
     */
    const getFieldNameInFormat = <
        TEntity extends EntityKeys,
        TField extends EntityFieldKeys<TEntity>,
        TFormat extends keyof FieldNameFormats<TEntity, TField>
    >(
        entityKey: TEntity,
        fieldKey: TField,
        format: TFormat
    ): FieldNameFormat<TEntity, TField, TFormat> => {
        if (
            !(entityKey in fieldNameFormats) ||
            !(fieldKey in fieldNameFormats[entityKey]) ||
            !(format in fieldNameFormats[entityKey][fieldKey])
        ) {
            throw new Error(
                `Invalid entity key, field key or format: ${entityKey}, ${fieldKey}, ${String(format)}`
            );
        }

        return fieldNameFormats[entityKey][fieldKey][format];
    };

    /**
     * Resolves any field name variation to a specific format
     */
    const resolveFieldNameInFormat = <
        TEntity extends EntityKeys,
        TField extends EntityFieldKeys<TEntity>,
        TFormat extends keyof FieldNameFormats<TEntity, TField>
    >(
        entityVariant: AllEntityNameVariations,
        fieldVariant: AllFieldNameVariations<TEntity, EntityFieldKeys<TEntity>>,
        format: TFormat
    ): FieldNameFormat<TEntity, TField, TFormat> => {
        const {entityKey, fieldKey} = resolveEntityAndFieldKeys<TEntity>(
            entityVariant,
            fieldVariant
        );
        return getFieldNameInFormat(
            entityKey as TEntity,
            fieldKey as TField,
            format
        );
    };

    /**
     * Gets complete field data for any field name variation
     */
    const getFieldData = <
        TEntity extends EntityKeys,
        TField extends EntityFieldKeys<TEntity>
    >(
        entityVariant: AllEntityNameVariations,
        fieldVariant: AllFieldNameVariations<TEntity, TField>
    ): EntityField<TEntity, TField> => {
        const {entityKey, fieldKey} = resolveEntityAndFieldKeys<TEntity>(entityVariant, fieldVariant);
        const entitySchema = getEntitySchema<TEntity>(entityKey);
        const fieldData = entitySchema.entityFields[fieldKey];

        if (!fieldData) {
            throw new Error(`Field data not found for field: ${fieldKey}`);
        }
        return fieldData as EntityField<TEntity, TField>;
    };

    /**
     * Finds the primary key field for an entity
     */
    const findPrimaryKeyFieldKey = <TEntity extends EntityKeys>(
        entityVariant: AllEntityNameVariations
    ): EntityFieldKeys<TEntity> => {
        const entitySchema = getEntitySchema<TEntity>(entityVariant);
        const fields = entitySchema.entityFields;

        for (const fieldKey in fields) {
            if (fields[fieldKey].isPrimaryKey) {
                return fieldKey as EntityFieldKeys<TEntity>;
            }
        }
        throw new Error(`No primary key found for entity: ${entityVariant}`);
    };

    /**
     * Finds the display field for an entity
     */
    const findDisplayFieldKey = <TEntity extends EntityKeys>(
        entityVariant: AllEntityNameVariations
    ): EntityFieldKeys<TEntity> | null => {
        const entitySchema = getEntitySchema<TEntity>(entityVariant);
        const fields = entitySchema.entityFields;

        for (const fieldKey in fields) {
            if (fields[fieldKey].isDisplayField) {
                return fieldKey as EntityFieldKeys<TEntity>;
            }
        }
        return null;
    };

    /**
     * Gets all fields with a specific attribute
     */
    const getFieldsWithAttribute = <
        TEntity extends EntityKeys,
        TAttribute extends keyof EntityField<TEntity, EntityFieldKeys<TEntity>>
    >(
        entityVariant: AllEntityNameVariations,
        attributeName: TAttribute
    ): Record<EntityFieldKeys<TEntity>, EntityField<TEntity, EntityFieldKeys<TEntity>>[TAttribute]> => {
        const entitySchema = getEntitySchema<TEntity>(entityVariant);
        const fields = entitySchema.entityFields;

        const result: Record<string, unknown> = {};
        for (const fieldKey in fields) {
            const field = fields[fieldKey];
            if (attributeName in field) {
                result[fieldKey] = field[attributeName];
            }
        }
        return result as Record<
            EntityFieldKeys<TEntity>,
            EntityField<TEntity, EntityFieldKeys<TEntity>> [TAttribute]
        >;
    };

    /**
     * Finds fields that match a condition
     */
    const findFieldsByCondition = <TEntity extends EntityKeys>(
        entityVariant: AllEntityNameVariations,
        conditionCallback: (
            field: EntityField<TEntity, EntityFieldKeys<TEntity>>,
            fieldKey: EntityFieldKeys<TEntity>
        ) => boolean
    ): EntityFieldKeys<TEntity>[] => {
        const entitySchema = getEntitySchema<TEntity>(entityVariant);
        const fields = entitySchema.entityFields;

        const matchingFields: EntityFieldKeys<TEntity>[] = [];
        for (const fieldKey in fields) {
            const field = fields[fieldKey];
            if (conditionCallback(field, fieldKey as EntityFieldKeys<TEntity>)) {
                matchingFields.push(fieldKey as EntityFieldKeys<TEntity>);
            }
        }
        return matchingFields;
    };

    /**
     * Finds all fields that have a default generator function
     */
    const findFieldsWithDefaultGeneratorFunction = <TEntity extends EntityKeys>(
        entityVariant: AllEntityNameVariations
    ): EntityFieldKeys<TEntity>[] => {
        return findFieldsByCondition<TEntity>(
            entityVariant,
            (field) => field.defaultGeneratorFunction !== null
        );
    };


    const defaultGeneratorFunctions: DefaultGenerators = {
        generateUUID: () => uuidv4(),
        // Add more generator implementations
    };

    /**
     * Generates a default value using a named generator function
     */
    const generateDefaultValue = (
        generatorName: keyof DefaultGenerators | null
    ): string | null => {
        if (generatorName && generatorName in defaultGeneratorFunctions) {
            return defaultGeneratorFunctions[generatorName]();
        }
        return null;
    };

    /**
     * Sets default values for all single-field structures
     */
    const setSingleFieldsToDefault = <TEntity extends EntityKeys>(
        entityVariant: AllEntityNameVariations
    ): Record<EntityFieldKeys<TEntity>, unknown> => {
        const entitySchema = getEntitySchema<TEntity>(entityVariant);
        const fields = entitySchema.entityFields;

        const fieldValues: Record<string, unknown> = {};

        for (const fieldKey in fields) {
            const field = fields[fieldKey];

            if (field.structure === 'single') {
                let value: unknown;

                if (typeof field.defaultGeneratorFunction === 'string') {
                    value = generateDefaultValue(
                        field.defaultGeneratorFunction as keyof DefaultGenerators
                    );
                } else {
                    value = field.defaultValue;
                }

                fieldValues[fieldKey] = value;
            }
        }

        return fieldValues as Record<EntityFieldKeys<TEntity>, unknown>;
    };


    const getEntitySchemaInFormat = <
        TEntity extends EntityKeys,
        TFormat extends DataFormat
    >(
        entityVariant: AllEntityNameVariations,
        format: TFormat
    ): FormattedEntitySchema<TEntity, TFormat> => {
        const entitySchema = getEntitySchema<TEntity>(entityVariant);
        const entityKey = resolveEntityKey(entityVariant) as TEntity;

        if (!(format in entityNameFormats[entityKey])) {
            throw new Error(`Invalid format for entity: ${format}`);
        }

        // Create formatted fields object
        const formattedFields: Record<string, EntityField<TEntity, EntityFieldKeys<TEntity>>> = {};

        // Transform each field
        for (const fieldKey of Object.keys(entitySchema.entityFields)) {
            const typedFieldKey = fieldKey as EntityFieldKeys<TEntity>;
            const fieldValue = entitySchema.entityFields[typedFieldKey];

            // Get formatted field name
            const formattedFieldKey = getFieldNameInFormat(
                entityKey,
                typedFieldKey,
                format
            );

            formattedFields[formattedFieldKey] = fieldValue;
        }

        // Create the formatted schema
        const formattedSchema: FormattedEntitySchema<TEntity, TFormat> = {
            ...entitySchema,
            entityFields: formattedFields as FormattedEntitySchema<TEntity, TFormat>['entityFields']
        };

        // Brand the schema with its format
        assertFormat(formattedSchema, format);

        return formattedSchema;
    };

    /**
     * Create a new entity record with properly formatted field names
     */
    const createFormattedEntityRecord = <
        TEntity extends EntityKeys,
        TFormat extends DataFormat
    >(
        entityVariant: AllEntityNameVariations,
        data: Record<string, unknown>,
        format: TFormat
    ): EntityRecord<TEntity, TFormat> => {
        const entityKey = resolveEntityKey(entityVariant) as TEntity;
        const formattedSchema = getEntitySchemaInFormat<TEntity, TFormat>(entityVariant, format);

        const formattedData: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(data)) {
            const canonicalKey = resolveFieldKey(entityKey, key as AllFieldNameVariations<TEntity, EntityFieldKeys<TEntity>>);
            const formattedKey = getFieldNameInFormat(
                entityKey,
                canonicalKey,
                format
            );
            formattedData[formattedKey] = value;
        }

        // Create and brand the record
        const record = createFormattedRecord(
            entityKey,
            formattedData,
            format
        );

        return record;
    };


    /**
     * Basic object transformation without format branding
     */
    const transformObjectBasic = <
        TEntity extends EntityKeys,
        TFormat extends DataFormat
    >(
        entityVariant: AllEntityNameVariations,
        object: Record<string, unknown>,
        format: TFormat
    ): Record<string, unknown> => {
        const entityKey = resolveEntityKey(entityVariant) as TEntity;

        return Object.entries(object).reduce<Record<string, unknown>>((acc, [fieldName, value]) => {
            const fieldKey = resolveFieldKey(entityKey, fieldName as AllFieldNameVariations<TEntity, EntityFieldKeys<TEntity>>);
            const newKey = getFieldNameInFormat(entityKey, fieldKey, format);
            acc[newKey] = value;
            return acc;
        }, {});
    };

    /**
     * Type-safe object transformation with format branding
     */
    const transformObject = <
        TEntity extends EntityKeys,
        TFormat extends DataFormat
    >(
        entityVariant: AllEntityNameVariations,
        object: Record<string, unknown>,
        format: TFormat
    ): EntityRecord<TEntity, TFormat> => {
        const transformed = transformObjectBasic<TEntity, TFormat>(
            entityVariant,
            object,
            format
        );

        return createFormattedRecord(
            resolveEntityKey(entityVariant) as TEntity,
            transformed,
            format
        );
    };

    /**
     * Format-specific transformers with proper typing
     */
    const formatTransformers = {
        toFrontend: <TEntity extends EntityKeys>(
            entityVariant: AllEntityNameVariations,
            object: Record<string, unknown>
        ): EntityRecord<TEntity, 'frontend'> =>
            transformObject<TEntity, 'frontend'>(
                entityVariant,
                object,
                'frontend'
            ),

        toBackend: <TEntity extends EntityKeys>(
            entityVariant: AllEntityNameVariations,
            object: Record<string, unknown>
        ): EntityRecord<TEntity, 'backend'> =>
            transformObject<TEntity, 'backend'>(
                entityVariant,
                object,
                'backend'
            ),

        toDatabase: <TEntity extends EntityKeys>(
            entityVariant: AllEntityNameVariations,
            object: Record<string, unknown>
        ): EntityRecord<TEntity, 'database'> =>
            transformObject<TEntity, 'database'>(
                entityVariant,
                object,
                'database'
            ),

        toPretty: <TEntity extends EntityKeys>(
            entityVariant: AllEntityNameVariations,
            object: Record<string, unknown>
        ): EntityRecord<TEntity, 'pretty'> =>
            transformObject<TEntity, 'pretty'>(
                entityVariant,
                object,
                'pretty'
            ),

        toComponent: <TEntity extends EntityKeys>(
            entityVariant: AllEntityNameVariations,
            object: Record<string, unknown>
        ): EntityRecord<TEntity, 'component'> =>
            transformObject<TEntity, 'component'>(
                entityVariant,
                object,
                'component'
            ),

        toKebab: <TEntity extends EntityKeys>(
            entityVariant: AllEntityNameVariations,
            object: Record<string, unknown>
        ): EntityRecord<TEntity, 'kebab'> =>
            transformObject<TEntity, 'kebab'>(
                entityVariant,
                object,
                'kebab'
            ),

        toSqlFunctionRef: <TEntity extends EntityKeys>(
            entityVariant: AllEntityNameVariations,
            object: Record<string, unknown>
        ): EntityRecord<TEntity, 'sqlFunctionRef'> =>
            transformObject<TEntity, 'sqlFunctionRef'>(
                entityVariant,
                object,
                'sqlFunctionRef'
            ),

        toRestAPI: <TEntity extends EntityKeys>(
            entityVariant: AllEntityNameVariations,
            object: Record<string, unknown>
        ): EntityRecord<TEntity, 'RestAPI'> =>
            transformObject<TEntity, 'RestAPI'>(
                entityVariant,
                object,
                'RestAPI'
            ),

        toGraphQL: <TEntity extends EntityKeys>(
            entityVariant: AllEntityNameVariations,
            object: Record<string, unknown>
        ): EntityRecord<TEntity, 'GraphQL'> =>
            transformObject<TEntity, 'GraphQL'>(
                entityVariant,
                object,
                'GraphQL'
            ),

        toCustom: <TEntity extends EntityKeys>(
            entityVariant: AllEntityNameVariations,
            object: Record<string, unknown>
        ): EntityRecord<TEntity, 'custom'> =>
            transformObject<TEntity, 'custom'>(
                entityVariant,
                object,
                'custom'
            )
    } as const;


    /**
     * Type-safe format conversion utility
     */
    const convertFormat = <
        TEntity extends EntityKeys,
        TSourceFormat extends DataFormat,
        TTargetFormat extends DataFormat
    >(
        entityKey: TEntity,
        data: EntityRecord<TEntity, TSourceFormat>,
        targetFormat: TTargetFormat
    ): EntityRecord<TEntity, TTargetFormat> => {
        return transformObject<TEntity, TTargetFormat>(
            entityKey,
            data.data,
            targetFormat
        );
    };

    return {
        resolveEntityKey,
        setSingleFieldsToDefault,
        resolveFieldKey,
        resolveEntityAndFieldKeys,
        getEntityNameInFormat,
        getEntitySchema,
        resolveEntityNameInFormat,
        getFieldNameInFormat,
        resolveFieldNameInFormat,
        findPrimaryKeyFieldKey,
        findDisplayFieldKey,
        getFieldData,
        findFieldsByCondition,
        findFieldsWithDefaultGeneratorFunction,
        getFieldsWithAttribute,
        createFormattedEntityRecord,
        getEntitySchemaInFormat,
        formatTransformers,
        generateDefaultValue,
        transformObjectBasic,
        transformObject,
        schema,
        entityNameToCanonical,
        fieldNameToCanonical,
        entityNameFormats,
        fieldNameFormats
    } as const;
}


export function useTableSchema<TEntity extends EntityKeys>(tableVariant: AllEntityNameVariations) {
    const { schema } = useSchema();
    const { resolveEntityKey, getEntityNameInFormat, findPrimaryKeyFieldKey } = useSchemaResolution();
    const tableKey = resolveEntityKey(tableVariant) as TEntity;
    const tableSchema = schema[tableKey] as AutomationEntity<TEntity>;
    const primaryKeyField = findPrimaryKeyFieldKey(tableKey);
    const tableNameDbFormat = getEntityNameInFormat(tableKey, 'database');

    if (!primaryKeyField) {
        throw new Error(`No primary key found for table ${tableVariant}`);
    }

    return {
        tableKey,
        tableSchema,
        primaryKeyField,
        tableNameDbFormat
    };
}

