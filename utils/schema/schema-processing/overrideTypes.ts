import { EntityComponentProps, EntityKeys, FetchStrategy } from '@/types';
import { DisplayFieldMetadata } from '@/lib/redux/entity/types/stateTypes';

export type EntityOverrides<TEntity extends EntityKeys> = Partial<{
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


export type OverrideName =
    | 'schemaType'
    | 'entityName'
    | 'uniqueTableId'
    | 'uniqueEntityId'
    | 'primaryKey'
    | 'primaryKeyMetadata'
    | 'displayFieldMetadata'
    | 'defaultFetchStrategy'
    | 'componentProps'
    | 'entityNameFormats'
    | 'relationships'
    | 'entityFields';

export type Override = Record<OverrideName, any>;


export type AllEntityOverrides = Record<EntityKeys, Override>;

export type FieldOverrideName =
    | 'uniqueColumnId'
    | 'uniqueFieldId'
    | 'dataType'
    | 'isRequired'
    | 'maxLength'
    | 'isArray'
    | 'defaultValue'
    | 'isPrimaryKey'
    | 'isDisplayField'
    | 'defaultGeneratorFunction'
    | 'validationFunctions'
    | 'exclusionRules'
    | 'defaultComponent'
    | 'componentProps'
    | 'structure'
    | 'isNative'
    | 'typeReference'
    | 'enumValues'
    | 'entityName'
    | 'databaseTable'
    | 'foreignKeyReference'
    | 'description'
    | 'fieldNameFormats'
    | 'name'
    | 'displayName';

export type SingleFieldOverride = Partial<Record<FieldOverrideName, any>>;

export type AllFieldOverrides = Record<string, SingleFieldOverride>;

export type EntityFieldOverrides = {
    EntityKeys: AllFieldOverrides;
};

export type AllEntityFieldOverrides = Record<EntityKeys, AllFieldOverrides>;

// Define our processed field type
export type ProcessedField = {
    uniqueColumnId: string;
    uniqueFieldId: string;
    dataType: any;
    isRequired: boolean;
    maxLength: number | null;
    isArray: boolean;
    defaultValue: any;
    isPrimaryKey: boolean;
    isDisplayField: boolean;
    defaultGeneratorFunction: any;
    validationFunctions: any[];
    exclusionRules: any[];
    defaultComponent?: any;
    componentProps?: any;
    structure: any;
    isNative: boolean;
    typeReference: any;
    enumValues: any[];
    entityName: EntityKeys;
    databaseTable: string;
    foreignKeyReference: any;
    description: string;
    fieldNameFormats: any;
    name: string;
    displayName: string;
};

export type EntityProcessedFields<TEntity extends EntityKeys> = Record<string, ProcessedField>;