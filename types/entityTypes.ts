// types/entityTypes.ts

import {initialAutomationTableSchema} from "@/utils/schema/initialSchemas";
import {DataStructure, FetchStrategy, FieldDataOptionsType} from "@/types/AutomationSchemaTypes";

export type TypeBrand<T> = { _typeBrand: T };
export type ExtractType<T> = T extends TypeBrand<infer U> ? U : T;

export type MatrxRecordId = string;


/**
 * The complete automation schema containing all applets and their configurations
 */
export type AutomationSchema = typeof initialAutomationTableSchema;

/**
 * All valid entity names in the schema (e.g., 'registeredFunction', 'user', etc.)
 */
export type EntityKeys = keyof AutomationSchema;


// Add this somewhere in your code to verify the schema shape
// const schemaTypeCheck: AutomationEntities = initialAutomationTableSchema;

// Entity Name Format Mappings
/**
 * Maps an entity name to its various format variations (frontend, backend, database, etc.)
 * @example EntityNameFormats<'registeredFunction'> might return:
 * {
 *   frontend: "registeredFunction",
 *   backend: "registered_function",
 *   database: "registered_function",
 *   pretty: "Registered Function"
 * }
 */
export type EntityNameFormats<TEntity extends EntityKeys> =
    AutomationSchema[TEntity]['entityNameFormats'];

/**
 * Gets a specific format variation for an entity
 * @example EntityNameFormat<'registeredFunction', 'database'> might return 'registered_function'
 */
export type EntityNameFormat<
    TEntity extends EntityKeys,
    TFormat extends keyof EntityNameFormats<TEntity>
> = EntityNameFormats<TEntity>[TFormat];

/**
 * All possible format variations for an entity, including its original key
 */
export type EntityNameVariations<TEntity extends EntityKeys> =
    | TEntity
    | EntityNameFormats<TEntity>[keyof EntityNameFormats<TEntity>];

/**
 * Union of all possible entity name variations across all applets
 */
export type AllEntityNameVariations = {
    [TEntity in EntityKeys]: EntityNameVariations<TEntity>
}[EntityKeys];

// Field Keys
/**
 * All possible field keys across all applets
 */
export type AllEntityFieldKeys = AutomationSchema[EntityKeys] extends infer TField
                                 ? TField extends { entityFields: any }
                                   ? keyof TField["entityFields"]
                                   : never
                                 : never;

/**
 * All field keys for a specific entity
 */
export type EntityFieldKeys<TEntity extends keyof AutomationSchema> =
    AutomationSchema[TEntity] extends infer TField
    ? TField extends { entityFields: any }
      ? keyof TField["entityFields"]
      : never
    : never;


/**
 * All field keys from any entity
 */
export type EntityAnyFieldKey<TEntity extends keyof AutomationSchema> =
    AutomationSchema[TEntity] extends infer TField
    ? TField extends { entityFields: any }
      ? keyof TField["entityFields"]
      : never
    : never;

// Gets all field keys for just the User entity
type UserFields = EntityAnyFieldKey<'userPreferences'>;


// Field Name Format Mappings
/**
 * Maps a field name to its various format variations
 * @example For field 'dataType':
 * {
 *   frontend: "dataType",
 *   backend: "data_type",
 *   database: "data_type",
 *   pretty: "Data Type",
 *   component: "DataType",
 *   ...
 * }
 */
export type FieldNameFormats<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['fieldNameFormats'];

/**
 * Gets a specific format variation for a field
 * @example FieldNameFormat<'registeredFunction', 'dataType', 'database'> might return 'data_type'
 */
export type FieldNameFormat<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>,
    TFormat extends keyof FieldNameFormats<TEntity, TField>
> = FieldNameFormats<TEntity, TField>[TFormat];

/**
 * Available format types for a field (e.g., 'frontend', 'backend', 'database', 'pretty', etc.)
 */
export type FieldFormatTypes<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = keyof FieldNameFormats<TEntity, TField>;

/**
 * All possible format variations for a field, including its original key
 */
export type AllFieldNameVariations<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> =
    | TField
    | FieldNameFormats<TEntity, TField>[keyof FieldNameFormats<TEntity, TField>];

/**
 * Gets all field name variations for all fields of an entity
 */
export type AllEntityFieldVariations<TEntity extends EntityKeys> = {
    [TField in EntityFieldKeys<TEntity>]: AllFieldNameVariations<TEntity, TField>
}[EntityFieldKeys<TEntity>];


/**
 * Represents any single canonical field name for an entity
 */
export type CanonicalFieldKey<TEntity extends EntityKeys> = EntityFieldKeys<TEntity> extends infer K
                                                            ? K extends string
                                                              ? K
                                                              : never
                                                            : never;

type regFuncPretty = EntityNameFormat<'registeredFunction', 'pretty'>; // Shows  "Registered Function"
type regFuncModulePathFieldPretty = FieldNameFormat<'registeredFunction', 'modulePath', 'pretty'>; // Shows "Module Path"


// Basic types
type test01 = EntityKeys; // Should show 'registeredFunction' as one of the options

// Entity Name related
type test02 = EntityNameFormats<'registeredFunction'>;  // Shows the mapping structure
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

export type FieldDatabaseColumn<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>,
> = FieldNameFormats<TEntity, TField>['database'];

type testRegFuncField = FieldDatabaseColumn<'registeredFunction', 'modulePath'>;

export type EntityDatabaseTable<
    TEntity extends EntityKeys,
> = EntityNameFormats<TEntity>['database'];


type testRegFuncTable = EntityDatabaseTable<'registeredFunction'>;

type test1 = EntityDatabaseTable<'registeredFunction'>; // specific table



// Important Derived Types ===================================================

export type AnyEntityDatabaseTable = EntityDatabaseTable<EntityKeys>;

export type AnyDatabaseColumnForEntity<TEntity extends EntityKeys> = FieldDatabaseColumn<
    TEntity,
    EntityFieldKeys<TEntity>
>;

export type AllDatabaseColumnsAllEntities = {
    [Entity in EntityKeys]: AnyDatabaseColumnForEntity<Entity>
}[EntityKeys];


// Tests for the derived types ===================================================
type test2 = AnyEntityDatabaseTable;

type regFuncColumns = AnyDatabaseColumnForEntity<'registeredFunction'>;

type test3 = AllDatabaseColumnsAllEntities;


export type FieldDataType<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['dataType'];

export type FieldEnumValues<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['enumValues'];

export type FieldIsArray<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['isArray'];

export type FieldStructure<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['structure'];

export type FieldIsNative<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['isNative'];

export type FieldTypeReference<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = ExtractType<AutomationSchema[TEntity]['entityFields'][TField]['typeReference']>;

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

/**
 * Field-level type definitions
 */
export type FieldExclusionRules<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['exclusionRules'];

export type FieldDatabaseTable<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = AutomationSchema[TEntity]['entityFields'][TField]['databaseTable'];

/**
 * Comprehensive field configuration type containing all field-level settings
 */

export type ForeignKeyReference = {
    table: AnyEntityDatabaseTable;
    column: AnyDatabaseColumnForEntity<EntityKeys>;
}


export type EntityField<TEntity extends EntityKeys, TField extends EntityFieldKeys<TEntity>> = {
    fieldNameFormats: FieldNameFormats<TEntity, TField>;
    value: any;
    uniqueColumnId: string;
    uniqueFieldId: string;
    dataType: FieldDataType<TEntity, TField>;
    isArray: FieldIsArray<TEntity, TField>;
    structure: FieldStructure<TEntity, TField>;
    isNative: FieldIsNative<TEntity, TField>;
    typeReference: FieldTypeReference<TEntity, TField>;
    defaultComponent?: FieldDefaultComponent<TEntity, TField>;
    componentProps?: FieldComponentProps<TEntity, TField>;
    isRequired: FieldIsRequired<TEntity, TField>;
    maxLength: FieldMaxLength<TEntity, TField>;
    defaultValue: FieldDefaultValue<TEntity, TField>;
    isPrimaryKey: FieldIsPrimaryKey<TEntity, TField>;
    isDisplayField: FieldIsDisplayField<TEntity, TField>;
    defaultGeneratorFunction: FieldDefaultGeneratorFunction<TEntity, TField>;
    validationFunctions: FieldValidationFunctions<TEntity, TField>;
    exclusionRules: FieldExclusionRules<TEntity, TField>;
    enumValues: FieldEnumValues<TEntity, TField>;
    entityName: EntityKeys;
    databaseTable: FieldDatabaseTable<TEntity, TField>;
    foreignKeyReference: ForeignKeyReference | null;
    description: string;
};

// name: string;
// displayName: string;
// isPrimaryKey: boolean;
// isDisplayField?: boolean;
// dataType: FieldDataOptionsType;
// isArray: boolean;
// structure: DataStructure;
// isNative: boolean;
// defaultComponent?: string;
// componentProps: ComponentProps;
// isRequired: boolean;
// maxLength: number;
// defaultValue: any;
// defaultGeneratorFunction: string;
// validationFunctions: string[];
// exclusionRules: string[];
// enumValues: string[];
// entityName: EntityKeys;
// databaseTable: string;
// description: string;


/**
 * Define the base relationship structure
 */
export interface Relationship {
    relationshipType: 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
    column: string;
    relatedTable: string;
    relatedColumn: string;
    junctionTable: string | null;
}

/**
 * Type for an array of relationships or empty array
 */
export type RelationshipArray = readonly Relationship[] | readonly [];

/**
 * Entity-level relationships type that preserves the exact structure from the schema
 */
export type EntityRelationships<TEntity extends EntityKeys> =
    Extract<AutomationSchema[TEntity]['relationships'], RelationshipArray>;


export type EntitySchemaType<TEntity extends EntityKeys> =
    AutomationSchema[TEntity]['schemaType'];

/**
 * Entity-specific fetch strategy that preserves the schema relationship
 */
export type EntityDefaultFetchStrategy<TEntity extends EntityKeys> =
    Extract<AutomationSchema[TEntity]['defaultFetchStrategy'], FetchStrategy>;

/**
 * Type guard to ensure fetch strategy is valid
 */
export function isFetchStrategy(value: unknown): value is FetchStrategy {
    const validStrategies: readonly string[] = [
        'simple',
        'fk',
        'ifk',
        'm2m',
        'fkAndIfk',
        'm2mAndFk',
        'm2mAndIfk',
        'fkIfkAndM2M',
        'none'
    ] as const;

    return typeof value === 'string' && validStrategies.includes(value);
}


export type EntityComponentProps<TEntity extends EntityKeys> =
    AutomationSchema[TEntity]['componentProps'];


type test14 = EntityDefaultFetchStrategy<'registeredFunction'>; // Shows default fetch strategy for an entity
type test15 = EntityRelationships<'registeredFunction'>; // Shows default fetch strategy for an entity


// ========== Potential Simplified Schema ==========

export type SchemaCombined<TEntity extends EntityKeys> = {
    schemaType: EntitySchemaType<TEntity>;
    defaultFetchStrategy: FetchStrategy;
    componentProps: EntityComponentProps<TEntity>;
    entityNameFormats: EntityNameFormats<TEntity>;
    relationships: EntityRelationships<TEntity>;
    entityFields: {
        [TField in EntityFieldKeys<TEntity>]: {
            value: any;
            dataType: FieldDataType<TEntity, TField>;
            isArray: FieldIsArray<TEntity, TField>;
            structure: FieldStructure<TEntity, TField>;
            isNative: FieldIsNative<TEntity, TField>;
            typeReference: FieldTypeReference<TEntity, TField>;
            defaultComponent?: FieldDefaultComponent<TEntity, TField>;
            componentProps?: FieldComponentProps<TEntity, TField>;
            isRequired: FieldIsRequired<TEntity, TField>;
            maxLength: FieldMaxLength<TEntity, TField>;
            defaultValue: FieldDefaultValue<TEntity, TField>;
            isPrimaryKey: FieldIsPrimaryKey<TEntity, TField>;
            isDisplayField: FieldIsDisplayField<TEntity, TField>;
            validationFunctions: FieldValidationFunctions<TEntity, TField>;
            exclusionRules: FieldExclusionRules<TEntity, TField>;
            fieldNameFormats: FieldNameFormats<TEntity, TField>;
            defaultGeneratorFunction: FieldDefaultGeneratorFunction<TEntity, TField>;
            enumValues: FieldEnumValues<TEntity, TField>;
            entityName: EntityKeys;
            databaseTable: FieldDatabaseTable<TEntity, TField>;
            description: string;
        };
    };
};

// ==========  ==========


/**
 * Complete entity configuration type containing all entity-level settings
 */

export type AutomationEntity<TEntity extends EntityKeys> = {
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
        [TField in EntityFieldKeys<TEntity>]: EntityField<TEntity, TField>;
    };
};


/**
 * Complete automation schema containing all applets
 */
export type AutomationEntities = {
    [TEntity in EntityKeys]: AutomationEntity<TEntity>;
};


export type ExtractPrimaryKeyInfo<TEntity extends EntityKeys> =
    AutomationEntity<TEntity>['primaryKeyMetadata'];

export type WhereClause<TEntity extends EntityKeys> =
    Record<ExtractPrimaryKeyInfo<TEntity>['database_fields'][number], unknown>;


export type EntityNameDatabaseMap = Record<EntityNameOfficial, string>;
export type EntityNameBackendMap = Record<EntityNameOfficial, string>;
export type FieldNameDatabaseMap = Record<EntityNameOfficial, Record<string, string>>;
export type FieldNameBackendMap = Record<EntityNameOfficial, Record<string, string>>;

export interface UnifiedSchemaCache {
    schema: AutomationEntities;
    entityNames: EntityKeys[];
    entities: Partial<Record<EntityKeys, SchemaEntity>>;
    fields: Record<string, SchemaField>;
    fieldsByEntity: Partial<Record<EntityKeys, string[]>>;
    entityNameToCanonical: Record<string, EntityKeys>;
    fieldNameToCanonical: Record<EntityKeys, Record<string, string>>;
    entityNameFormats: Record<EntityKeys, Record<string, string>>;
    fieldNameFormats: Record<EntityKeys, Record<string, Record<string, string>>>;
    entityNameToDatabase: Record<EntityKeys, string>;
    entityNameToBackend: Record<EntityKeys, string>;
    fieldNameToDatabase: Record<EntityKeys, Record<string, string>>;
    fieldNameToBackend: Record<EntityKeys, Record<string, string>>;
    fullEntityRelationships?: Record<EntityKeys, FullEntityRelationships>
}


/**
 * Maps any entity name variation to its canonical (official) name
 * @example { "registered_function": "registeredFunction", "RegisteredFunction": "registeredFunction" }
 */
export type EntityNameToCanonicalMap = {
    [variation in AllEntityNameVariations]: EntityKeys;
};

/**
 * Maps any field name variation to a single canonical field name, organized by entity
 */
export type FieldNameToCanonicalMap = {
    [TEntity in EntityKeys]: {
        [variation: string]: CanonicalFieldKey<TEntity>;
    };
};
/**
 * Maps an entity's canonical name to its format-specific variations
 * @example {
 *   registeredFunction: {
 *     frontend: "registeredFunction",
 *     backend: "registered_function",
 *     database: "registered_function"
 *   }
 * }
 */
export type EntityNameFormatMap = {
    [TEntity in EntityKeys]: {
        [TFormat in keyof EntityNameFormats<TEntity>]: EntityNameFormat<TEntity, TFormat>;
    };
};

/**
 * Maps a field's canonical name to its format-specific variations, organized by entity
 * @example {
 *   registeredFunction: {
 *     dataType: {
 *       frontend: "dataType",
 *       backend: "data_type",
 *       database: "data_type"
 *     }
 *   }
 * }
 */
export type FieldNameFormatMap = {
    [TEntity in EntityKeys]: {
        [TField in EntityFieldKeys<TEntity>]: {
            [TFormat in keyof FieldNameFormats<TEntity, TField>]: FieldNameFormat<TEntity, TField, TFormat>;
        };
    };
};

/**
 * Helper type to safely get formatted field names
 */
export type FormattedFieldName<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>,
    TFormat extends DataFormat
> = TFormat extends keyof FieldNameFormats<TEntity, TField>
    ? FieldNameFormat<TEntity, TField, TFormat>
    : string;

/**
 * Represents a formatted entity schema with field names in a specific format
 */
export type FormattedEntitySchema<
    TEntity extends EntityKeys,
    TFormat extends DataFormat
> = Omit<AutomationEntity<TEntity>, 'entityFields'> & {
    entityFields: {
        [TField in EntityFieldKeys<TEntity> as FormattedFieldName<
            TEntity,
            TField,
            TFormat
        >]: EntityField<TEntity, TField>;
    };
};

/**
 * Available default generator functions
 */
export type DefaultGeneratorFunction = () => unknown;

export type DefaultGenerators = {
    generateUUID: () => string;
};


// 1. Format Definitions and Branding
export const FORMAT_KEYS = [
    'frontend',
    'backend',
    'database',
    'pretty',
    'component',
    'kebab',
    'sqlFunctionRef',
    'RestAPI',
    'GraphQL',
    'custom'
] as const;

export type DataFormat = typeof FORMAT_KEYS[number];

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
export type EntityRecord<
    TEntity extends EntityKeys,
    TFormat extends DataFormat
> = {
    [K in EntityFieldKeys<TEntity> as EntityNameFormat<TEntity, TFormat>]:
    FieldTypeReference<TEntity, K> extends undefined
    ? never
    : FieldTypeReference<TEntity, K>
} & FormatBrand<Record<string, unknown>, TFormat>;  // Fixed: Changed unknown to Record<string, unknown>

// 2. Type Guards and Assertions
export const isFormat = <T extends Record<string, unknown>, F extends DataFormat>(
    value: unknown,
    format: F
): value is FormatBrand<T, F> => {
    return (
        value !== null &&
        typeof value === 'object' &&
        '__format' in value &&
        (value as FormatBrand<T, F>).__format === format
    );
};

export function assertFormat<T extends Record<string, unknown>, F extends DataFormat>(
    value: T,
    format: F
): asserts value is T & FormatBrand<T, F> {  // Fixed: Changed return type to include original type T
    const formattedValue = value as T & FormatBrand<T, F>;
    Object.defineProperty(formattedValue, 'data', {
        value,
        enumerable: true,
        writable: false
    });
    Object.defineProperty(formattedValue, '__format', {
        value: format,
        enumerable: false,
        writable: false
    });
}

// 3. Type-Safe Data Conversion Functions
/**
 * Converts field names to a specific format
 */
export function convertFieldNames<
    TEntity extends EntityKeys,
    TSourceFormat extends DataFormat,
    TTargetFormat extends DataFormat
>(
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
export function enforceFieldTypes<
    TEntity extends EntityKeys,
    TFormat extends DataFormat
>(
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
export function ensureRequiredFields<
    TEntity extends EntityKeys,
    TFormat extends DataFormat
>(
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
export function createFormattedRecord<
    TEntity extends EntityKeys,
    TFormat extends DataFormat
>(
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
export function convertFormat<
    TEntity extends EntityKeys,
    TSourceFormat extends DataFormat,
    TTargetFormat extends DataFormat
>(
    entity: TEntity,
    data: FormatBrand<Record<string, unknown>, TSourceFormat>,
    targetFormat: TTargetFormat
): EntityRecord<TEntity, TTargetFormat> {
    // Convert field names to target format
    const convertedNames = convertFieldNames(
        entity,
        data.data,
        data.__format,
        targetFormat
    );

    // Create new formatted record
    return createFormattedRecord(entity, convertedNames, targetFormat);
}


type EntitySliceState<TEntity extends EntityKeys> = {
    data: Array<EntityData<TEntity>>; // Object array of Record<FieldKey, TypeReference> (The actual data)
    totalCount: number; // Total number must come from the first fetch operation.
    allPkAndDisplayFields: Array<{  // Also fetched with the first fetch operation
        pk: string;  // Derived from the primary key field of the entity (Must convert to string)
        display?: string;  // Derived from the display field of the entity (Must convert to string)
    }>;
    initialized: boolean;
    loading: boolean;
    error: string | null;
    lastFetched: Record<string, Date>;
    staleTime: number;
    backups: Record<string, EntityData<TEntity>[]>; // Backup of previous data states (When necessary and triggered)
    selectedItem: EntityData<TEntity> | null;   // Tracks the ACTIVE row (record) in the entity
    entitySchema: AutomationEntity<EntityKeys>;  // The only remaining thing about the entity schema system!
    page: number; // Current page number for pagination
    pageSize: number; // Number of records per page
};

// Redux Types:
/**
 * Builds the data structure type from entity fields
 */
export type EntityData<TEntity extends EntityKeys> = {
    [TField in keyof AutomationEntity<TEntity>['entityFields'] as AutomationEntity<TEntity>['entityFields'][TField]['isNative'] extends true
      ? TField
      : never]: ExtractType<AutomationEntity<TEntity>['entityFields'][TField]['typeReference']>
} & {
    [TField in keyof AutomationEntity<TEntity>['entityFields'] as AutomationEntity<TEntity>['entityFields'][TField]['isRequired'] extends true
          ? TField
          : never]: ExtractType<AutomationEntity<TEntity>['entityFields'][TField]['typeReference']>
};

export type registeredFunctionData = EntityData<'registeredFunction'>;
export type userPreferencesData = EntityData<'userPreferences'>;
export type brokerData = EntityData<'broker'>;


export type EntityDataOptional<TEntity extends EntityKeys> = {
    [TField in keyof AutomationEntity<TEntity>['entityFields'] as AutomationEntity<TEntity>['entityFields'][TField]['isNative'] extends true
                                                                  ? TField
                                                                  : never]?: ExtractType<AutomationEntity<TEntity>['entityFields'][TField]['typeReference']>;
} & {
    [TField in keyof AutomationEntity<TEntity>['entityFields'] as AutomationEntity<TEntity>['entityFields'][TField]['isRequired'] extends true
                                                                  ? TField
                                                                  : never]?: ExtractType<AutomationEntity<TEntity>['entityFields'][TField]['typeReference']>;
};

type registeredFunctionDataOptional = EntityDataOptional<'registeredFunction'>;
type userPreferencesDataOptional = EntityDataOptional<'userPreferences'>;
type brokerDataOptional = EntityDataOptional<'broker'>;


export type EntityDataMixed<TEntity extends EntityKeys> = {
    // Required fields (isRequired is true)
    [TField in keyof AutomationEntity<TEntity>['entityFields'] as AutomationEntity<TEntity>['entityFields'][TField]['isRequired'] extends true
        ? TField
        : never]: ExtractType<AutomationEntity<TEntity>['entityFields'][TField]['typeReference']>
} & {
    // Optional fields (isRequired is false)
    [TField in keyof AutomationEntity<TEntity>['entityFields'] as AutomationEntity<TEntity>['entityFields'][TField]['isRequired'] extends false
        ? TField
        : never]?: ExtractType<AutomationEntity<TEntity>['entityFields'][TField]['typeReference']>
};


type registeredFunctionDataMixed = EntityDataMixed<'registeredFunction'>;
type userPreferencesDataMixed = EntityDataMixed<'userPreferences'>;
type brokerDataMixed = EntityDataMixed<'broker'>;

import {Draft} from 'immer';
import {EntityNameOfficial, relationships, SchemaEntity} from "@/types/schema";
import {ComponentProps, DisplayFieldMetadata, PrimaryKeyMetadata} from "@/lib/redux/entity/types/stateTypes";
import {SchemaField} from "@/lib/redux/schema/concepts/types";
import {FullEntityRelationships} from "@/utils/schema/fullRelationships";

type EntityDataDraft<TEntity extends EntityKeys> = Draft<{
    [TField in keyof AutomationEntity<TEntity>['entityFields'] as AutomationEntity<TEntity>['entityFields'][TField]['isNative'] extends true
                                                                  ? TField
                                                                  : never]?: ExtractType<AutomationEntity<TEntity>['entityFields'][TField]['typeReference']>;
} & {
    [TField in keyof AutomationEntity<TEntity>['entityFields'] as AutomationEntity<TEntity>['entityFields'][TField]['isRequired'] extends true
                                                                  ? TField
                                                                  : never]?: ExtractType<AutomationEntity<TEntity>['entityFields'][TField]['typeReference']>;
}>;

type registeredFunctionDataDraft = EntityDataDraft<'registeredFunction'>;
type userPreferencesDataDraft = EntityDataDraft<'userPreferences'>;
type registeredFunctionPrimaryKey = FieldIsPrimaryKey<'registeredFunction', 'id'>;
type brokerDataDraft = EntityDataDraft<'broker'>;

/**
 * Gets the pretty name for an entity
 * @example
 * type name = PrettyEntityName<'registeredFunction'> // "Registered Function"
 */
export type PrettyEntityName<TEntity extends EntityKeys> = EntityNameFormat<TEntity, 'pretty'>;

/**
 * Gets the pretty name for a field of an entity
 * @example
 * type name = PrettyFieldName<'registeredFunction', 'modulePath'> // "Module Path"
 */
export type PrettyFieldName<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
> = FieldNameFormat<TEntity, TField, 'pretty'>;

/**
 * Gets an object type containing all pretty field names for an entity
 * @example
 * type names = EntityPrettyFields<'registeredFunction'>
 * // {
 * //   modulePath: "Module Path",
 * //   name: "Name",
 * //   ...
 * // }
 */
export type EntityPrettyFields<TEntity extends EntityKeys> = {
    [TField in EntityFieldKeys<TEntity>]: PrettyFieldName<TEntity, TField>;
};

// Usage examples:
type regFuncPrettyName = PrettyEntityName<'registeredFunction'>; // "Registered Function"
type modulePathPretty = PrettyFieldName<'registeredFunction', 'modulePath'>; // "Module Path"
type allPrettyFields = EntityPrettyFields<'registeredFunction'>; // Object with all pretty field names


export type EntitySelectOption<TEntity extends EntityKeys> = {
    value: TEntity;
    label: PrettyEntityName<TEntity>;
};


// // Usage example:
// const example = () => {
//     // Get a schema in database format
//     const dbSchema = getEntitySchemaInFormat('users', 'database');
//
//     // Create a record in frontend format
//     const frontendRecord = createFormattedEntityRecord(
//         'users',
//         { id: 1, first_name: "John" },
//         'frontend'
//     );
//
//     // TypeScript now knows the exact shape of both objects
//     // and their format brands
// };

// // 5. Usage Examples
// function exampleUsage() {
//     // Example data
//     const dbData = {
//         user_id: 1,
//         first_name: "John",
//         last_name: "Doe"
//     };
//
//     // Create database-formatted record
//     const dbRecord = createFormattedRecord(
//         "user",
//         dbData,
//         "database"
//     );
//
//     // Convert to frontend format
//     const frontendRecord = convertFormat(
//         "user",
//         dbRecord,
//         "frontend"
//     );
//
//     // Type-safe access
//     if (isFormat(frontendRecord, "frontend")) {
//         console.log(frontendRecord.data.userId);  // Properly formatted field name
//     }
// }
//
// // 6. React Hooks Integration
// function useEntityData<TEntity extends EntityKeys>(
//     entity: TEntity,
//     initialFormat: DataFormat = "frontend"
// ) {
//     const [data, setData] = useState<EntityRecord<TEntity, typeof initialFormat> | null>(null);
//
//     const updateData = useCallback((
//         newData: Record<string, unknown>,
//         format: DataFormat = initialFormat
//     ) => {
//         const formatted = createFormattedRecord(entity, newData, format);
//         setData(formatted as any); // Type assertion needed due to format variation
//     }, [entity, initialFormat]);
//
//     const convertTo = useCallback((
//         targetFormat: DataFormat
//     ) => {
//         if (!data) return null;
//         return convertFormat(entity, data as any, targetFormat);
//     }, [data, entity]);
//
//     return { data, updateData, convertTo };
// }
//
// // 7. Redux Integration
// const entityActions = {
//     fetchEntity: <TEntity extends EntityKeys>(
//         entity: TEntity
//     ) => ({
//         type: "FETCH_ENTITY" as const,
//         payload: { entity }
//     }),
//
//     setEntityData: <TEntity extends EntityKeys>(
//         entity: TEntity,
//         data: EntityRecord<TEntity, "frontend">
//     ) => ({
//         type: "SET_ENTITY_DATA" as const,
//         payload: { entity, data }
//     })
// };

// // 5. Usage Examples
// type Example = {
//     // Create a new record
//     createExample: () => {
//         const data = { name: "test" };
// const dbRecord = createFormattedRecord("registeredFunction", data, "database");
// const frontendRecord = convertFormat("registeredFunction", dbRecord, "frontend");
//
// // Type checking ensures format safety
// if (isFormat(frontendRecord, "frontend")) {
//     console.log(frontendRecord.data);
// }
// };
//
// // Redux example
// reduxExample: () => {
//     const actions = {
//         fetchEntity: <TEntity extends EntityKeys>(
//             entity: TEntity
//         ) => ({
//             type: "FETCH_ENTITY" as const,
//             payload: { entity }
//         }),
//
//         setEntityData: <TEntity extends EntityKeys>(
//             entity: TEntity,
//             data: CompleteEntityRecord<TEntity, "frontend">
//         ) => ({
//             type: "SET_ENTITY_DATA" as const,
//             payload: { entity, data }
//         })
//     };
//
//     return actions;
// };
//
// // React Hook example
// hookExample: () => {
//     function useEntityData<TEntity extends EntityKeys>(
//         entity: TEntity
//     ) {
//         const [data, setData] = useState<EntityRecord<TEntity, "frontend"> | null>(null);
//
//         const updateData = useCallback((
//             newData: Record<string, unknown>
//         ) => {
//             const formatted = createFormattedRecord(entity, newData, "frontend");
//             setData(formatted);
//         }, [entity]);
//
//         return { data, updateData };
//     }
//
//     return useEntityData;
// };
// };
