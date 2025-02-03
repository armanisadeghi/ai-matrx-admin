import { PrimaryKeyMetadata, DisplayFieldMetadata } from '@/lib/redux/entity/types/stateTypes';
import { EntityComponentProps, EntityKeys, EntityNameFormats } from '@/types';
import { initialAutomationTableSchema } from '../initialSchemas';
import { OverrideName, EntityProcessedFields, EntityOverrides } from './overrideTypes';

// Define our strict output types
export type ProcessedPrimaryKeyMetadata = PrimaryKeyMetadata; // Will change later
export type ProcessedDisplayFieldMetadata = DisplayFieldMetadata; // Will change later
export type ProcessedFetchMode = 'native' | 'fkIfk' | 'fk' | 'ifk' | 'm2m' | null;
export type ProcessedComponentProps<TEntity extends EntityKeys> = EntityComponentProps<TEntity>; // Will change later
export type ProcessedEntityNameFormats<TEntity extends EntityKeys> = EntityNameFormats<TEntity>; // Will change later

// Helper functions remain the same
function isEmptyOverride(value: any): boolean {
    if (value === null || value === undefined || value === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
}

function getEntityOverride<T>(entityName: EntityKeys, overrideName: OverrideName, entityOverrides: Record<EntityKeys, EntityOverrides<EntityKeys>>): T | null {
    const entityOverride = entityOverrides[entityName];
    if (!entityOverride) return null;

    const override = entityOverride[overrideName];
    if (isEmptyOverride(override)) return null;

    return override as T;
}

// Individual override processors with strict output typing
export function processPrimaryKeyMetadataOverride(
    entityName: EntityKeys,
    originalValue: any, // Accept any input
    entityOverrides: Record<EntityKeys, EntityOverrides<EntityKeys>>
): ProcessedPrimaryKeyMetadata {
    const override = getEntityOverride<any>(entityName, 'primaryKeyMetadata', entityOverrides);
    return (override || originalValue) as ProcessedPrimaryKeyMetadata;
}

export function processDisplayFieldMetadataOverride(
    entityName: EntityKeys,
    originalValue: any,
    entityOverrides: Record<EntityKeys, EntityOverrides<EntityKeys>>
): ProcessedDisplayFieldMetadata {
    const override = getEntityOverride<any>(entityName, 'displayFieldMetadata', entityOverrides);
    return (override || originalValue) as ProcessedDisplayFieldMetadata;
}

export function processFetchModeOverride(
    entityName: EntityKeys,
    originalValue: 'm2mAndFk' | 'simple' | 'm2mAndIfk' | 'fk' | 'none' | 'fkIfkAndM2M' | 'ifk' | 'fkAndIfk' | 'm2m',
    entityOverrides: Record<EntityKeys, EntityOverrides<EntityKeys>>
): ProcessedFetchMode {
    const override = getEntityOverride<any>(entityName, 'defaultFetchStrategy', entityOverrides);
    const value = override || originalValue;

    // Transform the old fetch strategy to the new FetchMode
    const fetchModeMap: Record<string, ProcessedFetchMode> = {
        m2mAndFk: 'm2m',
        simple: 'native',
        m2mAndIfk: 'm2m',
        fk: 'fk',
        none: null,
        fkIfkAndM2M: 'fkIfk',
        ifk: 'ifk',
        fkAndIfk: 'fkIfk',
        m2m: 'm2m',
    };

    return fetchModeMap[value] as ProcessedFetchMode;
}

export function processComponentPropsOverride<TEntity extends EntityKeys>(
    entityName: TEntity,
    originalValue: any,
    entityOverrides: Record<EntityKeys, EntityOverrides<EntityKeys>>
): ProcessedComponentProps<TEntity> {
    const override = getEntityOverride<any>(entityName, 'componentProps', entityOverrides);
    return (override || originalValue) as ProcessedComponentProps<TEntity>;
}

export function processEntityNameFormatsOverride<TEntity extends EntityKeys>(
    entityName: TEntity,
    originalValue: any,
    entityOverrides: Record<EntityKeys, EntityOverrides<EntityKeys>>
): ProcessedEntityNameFormats<TEntity> {
    const override = getEntityOverride<any>(entityName, 'entityNameFormats', entityOverrides);
    return (override || originalValue) as ProcessedEntityNameFormats<TEntity>;
}

// Updated processEntity function to use new typed outputs
export function processEntity<TEntity extends EntityKeys>(
    entityName: TEntity,
    entityDef: (typeof initialAutomationTableSchema)[EntityKeys],
    processedFields: EntityProcessedFields<TEntity>,
    entityOverrides?: Record<EntityKeys, EntityOverrides<EntityKeys>>
) {
    const updatedEntity = {
        ...entityDef,
        entityName: entityName,
        displayName: entityDef.displayName,
        schemaType: entityDef.schemaType,
        primaryKey: entityDef.primaryKey,
        uniqueTableId: entityDef.uniqueTableId,
        uniqueEntityId: entityDef.uniqueEntityId,
        primaryKeyMetadata: processPrimaryKeyMetadataOverride(entityName, entityDef.primaryKeyMetadata, entityOverrides),
        displayFieldMetadata: processDisplayFieldMetadataOverride(entityName, entityDef.displayFieldMetadata, entityOverrides),
        defaultFetchStrategy: processFetchModeOverride(entityName, entityDef.defaultFetchStrategy, entityOverrides),
        componentProps: processComponentPropsOverride(entityName, entityDef.componentProps, entityOverrides),
        relationships: entityDef.relationships,
        entityNameFormats: processEntityNameFormatsOverride(entityName, entityDef.entityNameFormats, entityOverrides),
    };

    const updatedEntityWithFields = {
        ...updatedEntity,
        entityFields: processedFields,
    };

    return {
        updatedEntity,
        updatedEntityWithFields,
    };
}