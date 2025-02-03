// types/entityTypes.ts

import { initialAutomationTableSchema } from '@/utils/schema/initialSchemas';
import { FetchStrategy } from '@/types/AutomationSchemaTypes';
import { Draft } from 'immer';
import { EntityNameOfficial, SchemaEntity } from '@/types/schema';
import { DisplayFieldMetadata, PrimaryKeyMetadata } from '@/lib/redux/entity/types/stateTypes';
import { FullEntityRelationships } from '@/utils/schema/fullRelationships';

export type TypeBrand<T> = { _typeBrand: T };
export type ExtractType<T> = T extends TypeBrand<infer U> ? U : T;

export type MatrxRecordId = string;

export type AutomationSchema = typeof initialAutomationTableSchema;

export type EntityKeys = keyof AutomationSchema;

export type EntityNameFormats<TEntity extends EntityKeys> = AutomationSchema[TEntity]['entityNameFormats'];

export type EntityNameFormat<TEntity extends EntityKeys, TFormat extends keyof EntityNameFormats<TEntity>> = EntityNameFormats<TEntity>[TFormat];

export type EntityNameVariations<TEntity extends EntityKeys> = TEntity | EntityNameFormats<TEntity>[keyof EntityNameFormats<TEntity>];

export type AllEntityNameVariations = {
    [TEntity in EntityKeys]: EntityNameVariations<TEntity>;
}[EntityKeys];

export type AllEntityFieldKeys = AutomationSchema[EntityKeys] extends infer TField
    ? TField extends { entityFields: any }
        ? keyof TField['entityFields']
        : never
    : never;

export type FieldKeys = AutomationSchema[EntityKeys] extends infer TField
    ? TField extends { entityFields: any }
        ? keyof TField['entityFields']
        : never
    : never;

export type EntityFieldKeys<TEntity extends keyof AutomationSchema> = AutomationSchema[TEntity] extends infer TField
    ? TField extends { entityFields: any }
        ? keyof TField['entityFields']
        : never
    : never;

export type EntityAnyFieldKey<TEntity extends keyof AutomationSchema> = AutomationSchema[TEntity] extends infer TField
    ? TField extends { entityFields: any }
        ? keyof TField['entityFields']
        : never
    : never;

export type FieldNameFormats<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['fieldNameFormats'];

export type FieldNameFormat<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>,
    TFormat extends keyof FieldNameFormats<TEntity, TField>
> = FieldNameFormats<TEntity, TField>[TFormat];

export type FieldFormatTypes<TEntity extends EntityKeys, TField extends EntityFieldKeys<TEntity>> = keyof FieldNameFormats<TEntity, TField>;

export type AllFieldNameVariations<TEntity extends EntityKeys, TField extends EntityFieldKeys<TEntity>> =
    | TField
    | FieldNameFormats<TEntity, TField>[keyof FieldNameFormats<TEntity, TField>];

export type AllEntityFieldVariations<TEntity extends EntityKeys> = {
    [TField in EntityFieldKeys<TEntity>]: AllFieldNameVariations<TEntity, TField>;
}[EntityFieldKeys<TEntity>];

export type CanonicalFieldKey<TEntity extends EntityKeys> = EntityFieldKeys<TEntity> extends infer K ? (K extends string ? K : never) : never;

export type FieldDatabaseColumn<TEntity extends EntityKeys, TField extends EntityFieldKeys<TEntity>> = FieldNameFormats<TEntity, TField>['database'];

export type EntityDatabaseTable<TEntity extends EntityKeys> = EntityNameFormats<TEntity>['database'];

// Important Derived Types ===================================================

export type AnyEntityDatabaseTable = EntityDatabaseTable<EntityKeys>;

export type AnyDatabaseColumnForEntity<TEntity extends EntityKeys> = FieldDatabaseColumn<TEntity, EntityFieldKeys<TEntity>>;

export type AllDatabaseColumnsAllEntities = {
    [Entity in EntityKeys]: AnyDatabaseColumnForEntity<Entity>;
}[EntityKeys];

export type FieldDataType<TEntity extends EntityKeys, TField extends EntityFieldKeys<TEntity>> = AutomationSchema[TEntity]['entityFields'][TField]['dataType'];

export type FieldEnumValues<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['enumValues'];

export type FieldIsArray<TEntity extends EntityKeys, TField extends EntityFieldKeys<TEntity>> = AutomationSchema[TEntity]['entityFields'][TField]['isArray'];

export type FieldStructure<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['structure'];

export type FieldIsNative<TEntity extends EntityKeys, TField extends EntityFieldKeys<TEntity>> = AutomationSchema[TEntity]['entityFields'][TField]['isNative'];

export type FieldTypeReference<TEntity extends EntityKeys, TField extends EntityFieldKeys<TEntity>> = ExtractType<
    AutomationSchema[TEntity]['entityFields'][TField]['typeReference']
>;

export type FieldDefaultComponent<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['defaultComponent'];

export type FieldComponentProps<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['componentProps'];

export type FieldIsRequired<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['isRequired'];

export type FieldMaxLength<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['maxLength'];

export type FieldDefaultValue<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['defaultValue'];

export type FieldIsPrimaryKey<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['isPrimaryKey'];

export type FieldIsDisplayField<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['isDisplayField'];

export type FieldDefaultGeneratorFunction<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['defaultGeneratorFunction'];

export type FieldValidationFunctions<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['validationFunctions'];

export type FieldExclusionRules<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['exclusionRules'];

export type FieldDatabaseTable<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['databaseTable'];

export type ForeignKeyReference = {
    table: AnyEntityDatabaseTable;
    column: AnyDatabaseColumnForEntity<EntityKeys>;
    entity: EntityKeys;
    field: EntityFieldKeys<EntityKeys>;
};

export type EntityField<TEntity extends EntityKeys, TField extends EntityFieldKeys<TEntity>> = {
    uniqueColumnId: string;
    uniqueFieldId: string;
    name: AllFieldNameVariations<TEntity, TField>;
    displayName: EntityNameFormat<TEntity, 'pretty'>;
    dataType: FieldDataType<TEntity, TField>;
    isRequired: FieldIsRequired<TEntity, TField>;
    maxLength: FieldMaxLength<TEntity, TField>;
    isArray: FieldIsArray<TEntity, TField>;
    defaultValue: FieldDefaultValue<TEntity, TField>;
    isPrimaryKey: FieldIsPrimaryKey<TEntity, TField>;
    isDisplayField: FieldIsDisplayField<TEntity, TField>;
    defaultGeneratorFunction: FieldDefaultGeneratorFunction<TEntity, TField>;
    validationFunctions: FieldValidationFunctions<TEntity, TField>;
    exclusionRules: FieldExclusionRules<TEntity, TField>;
    defaultComponent?: FieldDefaultComponent<TEntity, TField>;
    componentProps?: FieldComponentProps<TEntity, TField>;
    structure: FieldStructure<TEntity, TField>;
    isNative: FieldIsNative<TEntity, TField>;
    typeReference: FieldTypeReference<TEntity, TField>;
    enumValues: FieldEnumValues<TEntity, TField>;
    entityName: EntityKeys;
    databaseTable: FieldDatabaseTable<TEntity, TField>;
    foreignKeyReference: ForeignKeyReference | null;
    description: string;
    fieldNameFormats: FieldNameFormats<TEntity, TField>;
};

export interface Relationship {
    relationshipType: 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
    column: string;
    relatedTable: string;
    relatedColumn: string;
    junctionTable: string | null;
}

type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};

export type EntityRelationships<TEntity extends EntityKeys> = Mutable<AutomationSchema[TEntity]['relationships']> extends (infer R)[]
    ? R extends Relationship
        ? Relationship[]
        : never
    : never;

export type EntitySchemaType<TEntity extends EntityKeys> = AutomationSchema[TEntity]['schemaType'];

export type EntityDefaultFetchStrategy<TEntity extends EntityKeys> = Extract<AutomationSchema[TEntity]['defaultFetchStrategy'], FetchStrategy>;

export function isFetchStrategy(value: unknown): value is FetchStrategy {
    const validStrategies: readonly string[] = ['simple', 'fk', 'ifk', 'm2m', 'fkAndIfk', 'm2mAndFk', 'm2mAndIfk', 'fkIfkAndM2M', 'none'] as const;

    return typeof value === 'string' && validStrategies.includes(value);
}

export type EntityComponentProps<TEntity extends EntityKeys> = AutomationSchema[TEntity]['componentProps'];

// ========== Potential Simplified Schema ==========

export type SchemaCombined<TEntity extends EntityKeys> = {
    schemaType: EntitySchemaType<TEntity>;
    entityName: TEntity;
    uniqueTableId: string;
    uniqueEntityId: string;
    primaryKey: string;
    primaryKeyMetadata: PrimaryKeyMetadata;
    displayFieldMetadata: DisplayFieldMetadata;
    defaultFetchStrategy: FetchStrategy;
    componentProps: EntityComponentProps<TEntity>;
    entityNameFormats: EntityNameFormats<TEntity>;
    relationships: EntityRelationships<TEntity>;
    entityFields: {
        [TField in EntityFieldKeys<TEntity>]: {
            uniqueColumnId: string;
            uniqueFieldId: string;
            dataType: FieldDataType<TEntity, TField>;
            isRequired: FieldIsRequired<TEntity, TField>;
            maxLength: FieldMaxLength<TEntity, TField>;
            isArray: FieldIsArray<TEntity, TField>;
            defaultValue: FieldDefaultValue<TEntity, TField>;
            isPrimaryKey: FieldIsPrimaryKey<TEntity, TField>;
            isDisplayField: FieldIsDisplayField<TEntity, TField>;
            defaultGeneratorFunction: FieldDefaultGeneratorFunction<TEntity, TField>;
            validationFunctions: FieldValidationFunctions<TEntity, TField>;
            exclusionRules: FieldExclusionRules<TEntity, TField>;
            defaultComponent?: FieldDefaultComponent<TEntity, TField>;
            componentProps?: FieldComponentProps<TEntity, TField>;
            structure: FieldStructure<TEntity, TField>;
            isNative: FieldIsNative<TEntity, TField>;
            typeReference: FieldTypeReference<TEntity, TField>;
            enumValues: FieldEnumValues<TEntity, TField>;
            entityName: EntityKeys;
            databaseTable: FieldDatabaseTable<TEntity, TField>;
            foreignKeyReference: ForeignKeyReference | null;
            description: string;
            fieldNameFormats: FieldNameFormats<TEntity, TField>;
        };
    };
};

export type AutomationEntity<TEntity extends EntityKeys> = {
    schemaType: EntitySchemaType<TEntity>;
    entityName: TEntity;
    name: string;
    displayName: string;
    uniqueTableId: string;
    uniqueEntityId: string;
    primaryKey: string;
    primaryKeyMetadata: PrimaryKeyMetadata;
    displayFieldMetadata: DisplayFieldMetadata;
    defaultFetchStrategy: FetchStrategy;
    componentProps: EntityComponentProps<TEntity>;
    entityNameFormats: EntityNameFormats<TEntity>;
    relationships: Relationship[];
    entityFields: {
        [TField in EntityFieldKeys<TEntity>]: EntityField<TEntity, TField>;
    };
};

export type AutomationEntities = {
    [TEntity in EntityKeys]: AutomationEntity<TEntity>;
};

export type ExtractPrimaryKeyInfo<TEntity extends EntityKeys> = AutomationEntity<TEntity>['primaryKeyMetadata'];

export type WhereClause<TEntity extends EntityKeys> = Record<ExtractPrimaryKeyInfo<TEntity>['database_fields'][number], unknown>;

export type EntityNameDatabaseMap = Record<EntityNameOfficial, string>;
export type EntityNameBackendMap = Record<EntityNameOfficial, string>;
export type FieldNameDatabaseMap = Record<EntityNameOfficial, Record<string, string>>;
export type FieldNameBackendMap = Record<EntityNameOfficial, Record<string, string>>;

export interface UnifiedSchemaCache {
    schema: AutomationEntities;
    entityNames: EntityKeys[];
    entitiesWithoutFields: Partial<Record<EntityKeys, SchemaEntity>>;
    entityNameToCanonical: Record<string, EntityKeys>;
    fieldNameToCanonical: Record<EntityKeys, Record<string, string>>;
    entityNameFormats: Record<EntityKeys, Record<string, string>>;
    fieldNameFormats: Record<EntityKeys, Record<string, Record<string, string>>>;
    entityNameToDatabase: Record<EntityKeys, string>;
    entityNameToBackend: Record<EntityKeys, string>;
    entityNametoPretty: Record<EntityKeys, string>;
    fieldNameToDatabase: Record<EntityKeys, Record<string, string>>;
    fieldNameToBackend: Record<EntityKeys, Record<string, string>>;
    fieldNameToPretty: Record<EntityKeys, Record<string, string>>;
    fullEntityRelationships?: Record<EntityKeys, FullEntityRelationships>;
}

export type EntityNameToCanonicalMap = {
    [variation in AllEntityNameVariations]: EntityKeys;
};

export type FieldNameToCanonicalMap = {
    [TEntity in EntityKeys]: {
        [variation: string]: CanonicalFieldKey<TEntity>;
    };
};

export type EntityNameFormatMap = {
    [TEntity in EntityKeys]: {
        [TFormat in keyof EntityNameFormats<TEntity>]: EntityNameFormat<TEntity, TFormat>;
    };
};

export type FieldNameFormatMap = {
    [TEntity in EntityKeys]: {
        [TField in EntityFieldKeys<TEntity>]: {
            [TFormat in keyof FieldNameFormats<TEntity, TField>]: FieldNameFormat<TEntity, TField, TFormat>;
        };
    };
};

export type FormattedFieldName<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>,
    TFormat extends DataFormat
> = TFormat extends keyof FieldNameFormats<TEntity, TField> ? FieldNameFormat<TEntity, TField, TFormat> : string;

export type FormattedEntitySchema<TEntity extends EntityKeys, TFormat extends DataFormat> = Omit<AutomationEntity<TEntity>, 'entityFields'> & {
    entityFields: {
        [TField in EntityFieldKeys<TEntity> as FormattedFieldName<TEntity, TField, TFormat>]: EntityField<TEntity, TField>;
    };
};

export type DefaultGeneratorFunction = () => unknown;

export type DefaultGenerators = {
    generateUUID: () => string;
};

// 1. Format Definitions and Branding
export const FORMAT_KEYS = ['frontend', 'backend', 'database', 'pretty', 'component', 'kebab', 'sqlFunctionRef', 'RestAPI', 'GraphQL', 'custom'] as const;

export type DataFormat = (typeof FORMAT_KEYS)[number];

/**
 * Brand interface for format-specific types
 */
export interface FormatBrand<T extends Record<string, unknown>, F extends DataFormat> {
    __format: F;
    data: T;
}

/**
 * Strongly typed entity record types for different formats
 */
export type EntityRecord<TEntity extends EntityKeys, TFormat extends DataFormat> = {
    [K in EntityFieldKeys<TEntity> as EntityNameFormat<TEntity, TFormat>]: FieldTypeReference<TEntity, K> extends undefined
        ? never
        : FieldTypeReference<TEntity, K>;
} & FormatBrand<Record<string, unknown>, TFormat>; // Fixed: Changed unknown to Record<string, unknown>

// 2. Type Guards and Assertions
export const isFormat = <T extends Record<string, unknown>, F extends DataFormat>(value: unknown, format: F): value is FormatBrand<T, F> => {
    return value !== null && typeof value === 'object' && '__format' in value && (value as FormatBrand<T, F>).__format === format;
};

export function assertFormat<T extends Record<string, unknown>, F extends DataFormat>(value: T, format: F): asserts value is T & FormatBrand<T, F> {
    // Fixed: Changed return type to include original type T
    const formattedValue = value as T & FormatBrand<T, F>;
    Object.defineProperty(formattedValue, 'data', {
        value,
        enumerable: true,
        writable: false,
    });
    Object.defineProperty(formattedValue, '__format', {
        value: format,
        enumerable: false,
        writable: false,
    });
}

// 3. Type-Safe Data Conversion Functions
/**
 * Converts field names to a specific format
 */
export function convertFieldNames<TEntity extends EntityKeys, TSourceFormat extends DataFormat, TTargetFormat extends DataFormat>(
    entity: TEntity,
    data: Record<string, unknown>,
    sourceFormat: TSourceFormat,
    targetFormat: TTargetFormat
): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // Implementation would use your field name mappings
    return result;
}

/**
 * Ensures values match their field type references
 */
export function enforceFieldTypes<TEntity extends EntityKeys, TFormat extends DataFormat>(
    entity: TEntity,
    data: Record<string, unknown>
): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // Implementation would use your FieldTypeReference
    return result;
}

/**
 * Ensures all required fields are present with defaults
 */
export function ensureRequiredFields<TEntity extends EntityKeys, TFormat extends DataFormat>(
    entity: TEntity,
    data: Record<string, unknown>
): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // Implementation would use your field requirements and defaults
    return result;
}

// 4. Main Conversion Functions
/**
 * Creates a new formatted record with type enforcement
 */
export function createFormattedRecord<TEntity extends EntityKeys, TFormat extends DataFormat>(
    entity: TEntity,
    data: Record<string, unknown>,
    format: TFormat
): EntityRecord<TEntity, TFormat> {
    // Ensure all required fields are present
    const withRequired = ensureRequiredFields(entity, data);

    // Enforce correct field types
    const withTypes = enforceFieldTypes(entity, withRequired);

    // Create the formatted record
    const formattedData = withTypes as Record<string, unknown>;
    assertFormat(formattedData, format);

    return formattedData as EntityRecord<TEntity, TFormat>;
}

/**
 * Converts between formats with full type safety
 */
export function convertFormat<TEntity extends EntityKeys, TSourceFormat extends DataFormat, TTargetFormat extends DataFormat>(
    entity: TEntity,
    data: FormatBrand<Record<string, unknown>, TSourceFormat>,
    targetFormat: TTargetFormat
): EntityRecord<TEntity, TTargetFormat> {
    // Convert field names to target format
    const convertedNames = convertFieldNames(entity, data.data, data.__format, targetFormat);

    // Create new formatted record
    return createFormattedRecord(entity, convertedNames, targetFormat);
}

export type EntityData<TEntity extends EntityKeys> = {
    [TField in keyof AutomationEntity<TEntity>['entityFields'] as AutomationEntity<TEntity>['entityFields'][TField]['isNative'] extends true
        ? TField
        : never]: ExtractType<AutomationEntity<TEntity>['entityFields'][TField]['typeReference']>;
} & {
    [TField in keyof AutomationEntity<TEntity>['entityFields'] as AutomationEntity<TEntity>['entityFields'][TField]['isRequired'] extends true
        ? TField
        : never]: ExtractType<AutomationEntity<TEntity>['entityFields'][TField]['typeReference']>;
};

export type EntityDataWithKey<TEntity extends EntityKeys> = EntityData<TEntity> & {
    matrxRecordId: MatrxRecordId;
};

export type ProcessedEntityData<TEntity extends EntityKeys> = EntityData<TEntity> & {
    matrxRecordId?: MatrxRecordId;
    [key: string]: any;
};

export type EntityDataOptional<TEntity extends EntityKeys> = {
    [TField in keyof AutomationEntity<TEntity>['entityFields'] as AutomationEntity<TEntity>['entityFields'][TField]['isNative'] extends true
        ? TField
        : never]?: ExtractType<AutomationEntity<TEntity>['entityFields'][TField]['typeReference']>;
} & {
    [TField in keyof AutomationEntity<TEntity>['entityFields'] as AutomationEntity<TEntity>['entityFields'][TField]['isRequired'] extends true
        ? TField
        : never]?: ExtractType<AutomationEntity<TEntity>['entityFields'][TField]['typeReference']>;
};

export type EntityDataMixed<TEntity extends EntityKeys> = {
    // Required fields (isRequired is true)
    [TField in keyof AutomationEntity<TEntity>['entityFields'] as AutomationEntity<TEntity>['entityFields'][TField]['isRequired'] extends true
        ? TField
        : never]: ExtractType<AutomationEntity<TEntity>['entityFields'][TField]['typeReference']>;
} & {
    // Optional fields (isRequired is false)
    [TField in keyof AutomationEntity<TEntity>['entityFields'] as AutomationEntity<TEntity>['entityFields'][TField]['isRequired'] extends false
        ? TField
        : never]?: ExtractType<AutomationEntity<TEntity>['entityFields'][TField]['typeReference']>;
};

type EntityDataDraft<TEntity extends EntityKeys> = Draft<
    {
        [TField in keyof AutomationEntity<TEntity>['entityFields'] as AutomationEntity<TEntity>['entityFields'][TField]['isNative'] extends true
            ? TField
            : never]?: ExtractType<AutomationEntity<TEntity>['entityFields'][TField]['typeReference']>;
    } & {
        [TField in keyof AutomationEntity<TEntity>['entityFields'] as AutomationEntity<TEntity>['entityFields'][TField]['isRequired'] extends true
            ? TField
            : never]?: ExtractType<AutomationEntity<TEntity>['entityFields'][TField]['typeReference']>;
    }
>;

export type PrettyEntityName<TEntity extends EntityKeys> = EntityNameFormat<TEntity, 'pretty'>;
export type BackendEntityName<TEntity extends EntityKeys> = EntityNameFormat<TEntity, 'backend'>;
export type DatabaseEntityName<TEntity extends EntityKeys> = EntityNameFormat<TEntity, 'database'>;

export type PrettyFieldName<TEntity extends EntityKeys, TField extends EntityFieldKeys<TEntity>> = FieldNameFormat<TEntity, TField, 'pretty'>;
export type BackendFieldName<TEntity extends EntityKeys, TField extends EntityFieldKeys<TEntity>> = FieldNameFormat<TEntity, TField, 'backend'>;
export type DatabaseFieldName<TEntity extends EntityKeys, TField extends EntityFieldKeys<TEntity>> = FieldNameFormat<TEntity, TField, 'database'>;

export type EntityPrettyFields<TEntity extends EntityKeys> = {
    [TField in EntityFieldKeys<TEntity>]: PrettyFieldName<TEntity, TField>;
};

export type EntitySelectOption<TEntity extends EntityKeys> = {
    value: TEntity;
    label: PrettyEntityName<TEntity>;
};

// Tests for the derived types ===================================================

type testRegFuncField = FieldDatabaseColumn<'registeredFunction', 'modulePath'>;

type testRegFuncTable = EntityDatabaseTable<'registeredFunction'>;

type test1 = EntityDatabaseTable<'registeredFunction'>; // specific table

type test2 = AnyEntityDatabaseTable;

type regFuncColumns = AnyDatabaseColumnForEntity<'registeredFunction'>;

type test3 = AllDatabaseColumnsAllEntities;

type userTable = (typeof initialAutomationTableSchema)['userPreferences'];
type anyTable = (typeof initialAutomationTableSchema)[EntityKeys];
type UserFields = EntityAnyFieldKey<'userPreferences'>;

type regFuncPretty = EntityNameFormat<'registeredFunction', 'pretty'>; // Shows  "Registered Function"
type regFuncModulePathFieldPretty = FieldNameFormat<'registeredFunction', 'modulePath', 'pretty'>; // Shows "Module Path"

// Basic types
type test01 = EntityKeys; // Should show 'registeredFunction' as one of the options

// Entity Name related
type test02 = EntityNameFormats<'registeredFunction'>; // Shows the mapping structure
type test03 = EntityNameFormat<'registeredFunction', 'database'>; // Shows specific variation
type test04 = EntityNameVariations<'registeredFunction'>; // Shows all variations including the key
type test05 = AllEntityNameVariations; // Shows all variations across all applets

// Entity Field related
type test06 = AllEntityFieldKeys; // Shows all possible field keys across all applets
type test07 = EntityFieldKeys<'registeredFunction'>; // Shows fields for specific entity
type test13 = CanonicalFieldKey<'registeredFunction'>; // Shows a single canonical field name for an entity
type test16 = EntityAnyFieldKey<'registeredFunction'>; //  "id" | "name" | "description" | "brokerReference" | "modulePath" | "className" | "returnBroker" | "systemFunctionInverse" | "argInverse

// Field Name related
type test08 = FieldNameFormats<'registeredFunction', 'modulePath'>; // Shows mapping structure
type test09 = FieldNameFormat<'registeredFunction', 'modulePath', 'database'>; // Shows specific variation
type test10 = FieldFormatTypes<'registeredFunction', 'modulePath'>; // Shows possible variation keys
type test11 = AllFieldNameVariations<'registeredFunction', 'modulePath'>; // Shows all variations including the key
type test12 = AllEntityFieldVariations<'registeredFunction'>; // Shows all variations for all fields of an entity

type test14 = EntityDefaultFetchStrategy<'registeredFunction'>; // Shows default fetch strategy for an entity
type test15 = EntityRelationships<'registeredFunction'>; // Shows default fetch strategy for an entity

type registeredFunctionData = EntityData<'registeredFunction'>;
type userPreferencesData = EntityData<'userPreferences'>;
type dataBrokerData = EntityData<'dataBroker'>;

type registeredFunctionDataOptional = EntityDataOptional<'registeredFunction'>;
type userPreferencesDataOptional = EntityDataOptional<'userPreferences'>;
type brokerDataOptional = EntityDataOptional<'broker'>;

type registeredFunctionDataMixed = EntityDataMixed<'registeredFunction'>;
type userPreferencesDataMixed = EntityDataMixed<'userPreferences'>;
type brokerDataMixed = EntityDataMixed<'broker'>;

type registeredFunctionDataDraft = EntityDataDraft<'registeredFunction'>;
type userPreferencesDataDraft = EntityDataDraft<'userPreferences'>;
type registeredFunctionPrimaryKey = FieldIsPrimaryKey<'registeredFunction', 'id'>;
type brokerDataDraft = EntityDataDraft<'broker'>;

type regFuncPrettyName = PrettyEntityName<'registeredFunction'>; // "Registered Function"
type modulePathPretty = PrettyFieldName<'registeredFunction', 'modulePath'>; // "Module Path"
type allPrettyFields = EntityPrettyFields<'registeredFunction'>; // Object with all pretty field names

type regFuncSelectOption = EntitySelectOption<'registeredFunction'>; // { value: 'registeredFunction', label: 'Registered Function' }
