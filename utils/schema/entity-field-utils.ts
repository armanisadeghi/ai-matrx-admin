import {
    EntityKeys,
    EntityFieldKeys,
    AutomationEntity,
    EntityField
} from "@/types/entityTypes";

/**
 * Gets typed entity field keys from a schema
 */
export const getEntityFieldKeys = <TEntity extends EntityKeys>(
    schema: AutomationEntity<TEntity>
): EntityFieldKeys<TEntity>[] => {
    return Object.keys(schema.entityFields) as EntityFieldKeys<TEntity>[];
};

/**
 * Process a single field with proper typing
 */
export const processField = <TEntity extends EntityKeys>(
    schema: AutomationEntity<TEntity>,
    fieldName: EntityFieldKeys<TEntity>,
    handler: (params: {
        fieldName: EntityFieldKeys<TEntity>,
        field: EntityField<TEntity, typeof fieldName>
    }) => React.ReactNode
): React.ReactNode => {
    const field = schema.entityFields[fieldName];
    return handler({
        fieldName,
        field: field as EntityField<TEntity, typeof fieldName>
    });
};

/**
 * Type guard to check if a field exists in the schema
 */
export const isValidField = <TEntity extends EntityKeys>(
    schema: AutomationEntity<TEntity>,
    fieldName: string
): fieldName is EntityFieldKeys<TEntity> => {
    return fieldName in schema.entityFields;
};
