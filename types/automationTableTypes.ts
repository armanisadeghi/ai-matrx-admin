import {
    AutomationTableName,
    DataStructure,
    FetchStrategy, FieldDataOptionsType,
    NameFormat, TypeBrand,
} from "@/types/AutomationSchemaTypes";
import {initialAutomationTableSchema} from "@/utils/schema/initialSchemas";

export type ExtractType<T> = T extends TypeBrand<infer U> ? U : T;


// ========== TS Lenient Types ========== https://claude.ai/chat/192336c5-86d5-40ad-88cf-4ced076fe9e5

// First, let's create a type that allows for safe type assertion
type Ensure<T, K extends T> = T;

// A utility type to make all nested properties optional
type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// A utility type that preserves the structure but makes type checking more lenient
type Lenient<T> = {
    [P in keyof T]: unknown extends T[P] ? any : T[P] extends object ? Lenient<T[P]> : T[P];
};

type Trust<T> = T extends object ? {
    [K in keyof T]: any;
} : any;

// Make everything optional and any
type PermissiveSchema<T> = {
    [K in keyof T]?: any;
};

// A simple assertion function to shut up TypeScript
export function assertType<T>(value: any): T {
    return value as T;
}

// Helper for field name resolution that tells TypeScript to trust your runtime system
export function resolveFieldName<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
>(table: TTable, field: any): TField {
    return field as TField;
}

// Helper for table name resolution
export function resolveTableName<T extends TableKeys>(name: any): T {
    return name as T;
}

// For when you need to work with the schema but don't want type checking
export type AnySchema = {
    [key: string]: any;
};

// ======================================================================
// this doesn't seem accurate
export type EntityFieldKeysForTable<TTable extends keyof InitialSchema> =
    InitialSchema[TTable] extends infer TField
    ? TField extends { entityFields: any }
      ? keyof TField['entityFields']
      : never
    : never;


export type InitialSchema = typeof initialAutomationTableSchema;
export type TableStructure<TTable extends TableKeys> = InitialSchema[TTable];
export type TableEntityFields<TTable extends TableKeys> = TableStructure<TTable>['entityFields'];

export type TableFieldKeys<TTable extends TableKeys> = keyof TableEntityFields<TTable>;


export type TableSchemaType = TableSchema['schemaType'];
export type TableEntityNameVariations = TableSchema['entityNameVariations'];
export type TableEntityNameVariationsValues = TableEntityNameVariations[keyof TableEntityNameVariations];
export type IndividualTableKeys = keyof TableSchema;
export type EntityFields = TableSchema['entityFields'];


export type TableSchema = InitialSchema[keyof InitialSchema];


export type TableKeys = keyof InitialSchema;

type EntityFieldKeys = InitialSchema[TableKeys] extends infer TField
       ? TField extends { entityFields: any }
         ? keyof TField["entityFields"]
         : never
       : never;

export type TableFields<TTable extends keyof InitialSchema> =
    InitialSchema[TTable] extends infer TField
    ? TField extends { entityFields: any }
      ? keyof TField["entityFields"]
      : never
    : never;





export type FieldNameMappings<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = InitialSchema[TTable]['entityFields'][TField]['fieldNameVariations'];

export type EntityNameMappings<TTable extends TableKeys> =
    InitialSchema[TTable]['entityNameVariations'];

export type FieldDataType<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = InitialSchema[TTable]['entityFields'][TField]['dataType'];

export type FieldEnumValues<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = InitialSchema[TTable]['entityFields'][TField]['enumValues'];

export type FieldIsArray<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = InitialSchema[TTable]['entityFields'][TField]['isArray'];

export type FieldStructure<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = InitialSchema[TTable]['entityFields'][TField]['structure'];

export type FieldIsNative<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = InitialSchema[TTable]['entityFields'][TField]['isNative'];

export type FieldTypeReference<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = ExtractType<InitialSchema[TTable]['entityFields'][TField]['typeReference']>;

export type FieldDefaultComponent<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = InitialSchema[TTable]['entityFields'][TField]['defaultComponent'];

export type FieldComponentProps<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = InitialSchema[TTable]['entityFields'][TField]['componentProps'];

export type FieldIsRequired<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = InitialSchema[TTable]['entityFields'][TField]['isRequired'];

export type FieldMaxLength<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = InitialSchema[TTable]['entityFields'][TField]['maxLength'];

export type FieldDefaultValue<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = InitialSchema[TTable]['entityFields'][TField]['defaultValue'];

export type FieldIsPrimaryKey<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = InitialSchema[TTable]['entityFields'][TField]['isPrimaryKey'];

export type FieldIsDisplayField<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = InitialSchema[TTable]['entityFields'][TField]['isDisplayField'];

export type FieldDefaultGeneratorFunction<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = InitialSchema[TTable]['entityFields'][TField]['defaultGeneratorFunction'];

export type FieldValidationFunctions<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = InitialSchema[TTable]['entityFields'][TField]['validationFunctions'];

export type FieldExclusionRules<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = InitialSchema[TTable]['entityFields'][TField]['exclusionRules'];

export type FieldDatabaseTable<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = InitialSchema[TTable]['entityFields'][TField]['databaseTable'];


export type EntityField<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = {
    fieldNameMappings: FieldNameMappings<TTable, TField>;
    value: any;
    dataType: FieldDataType<TTable, TField>;
    enumValues: FieldEnumValues<TTable, TField>;
    isArray: FieldIsArray<TTable, TField>;
    structure: FieldStructure<TTable, TField>;
    isNative: FieldIsNative<TTable, TField>;
    typeReference: FieldTypeReference<TTable, TField>;
    defaultComponent?: FieldDefaultComponent<TTable, TField>;
    componentProps?: FieldComponentProps<TTable, TField>;
    isRequired: FieldIsRequired<TTable, TField>;
    maxLength: FieldMaxLength<TTable, TField>;
    defaultValue: FieldDefaultValue<TTable, TField>;
    isPrimaryKey: FieldIsPrimaryKey<TTable, TField>;
    isDisplayField: FieldIsDisplayField<TTable, TField>;
    defaultGeneratorFunction: FieldDefaultGeneratorFunction<TTable, TField>;
    validationFunctions: FieldValidationFunctions<TTable, TField>;
    exclusionRules: FieldExclusionRules<TTable, TField>;
    databaseTable: FieldDatabaseTable<TTable, TField>;
};


export type Relationship<TTable extends TableKeys, TIndex extends number> = Relationships<TTable>[TIndex];

export type RelationshipType<TTable extends TableKeys, TIndex extends number> =
    Relationships<TTable>[TIndex]['relationshipType'];

export type RelationshipColumn<TTable extends TableKeys, TIndex extends number> =
    Relationships<TTable>[TIndex]['column'];

export type RelationshipRelatedTable<TTable extends TableKeys, TIndex extends number> =
    Relationships<TTable>[TIndex]['relatedTable'];

export type RelationshipTypes<TTable extends TableKeys> = Relationships<TTable>[number]['relationshipType'];


export type Relationships<TTable extends TableKeys> = InitialSchema[TTable]['relationships'];
export type SchemaType<TTable extends TableKeys> = InitialSchema[TTable]['schemaType'];
export type DefaultFetchStrategy<TTable extends TableKeys> = InitialSchema[TTable]['defaultFetchStrategy'];
export type ComponentProps<TTable extends TableKeys> = InitialSchema[TTable]['componentProps'];


export type AutomationTable<TTable extends TableKeys> = {
    schemaType: SchemaType<TTable>;
    defaultFetchStrategy: DefaultFetchStrategy<TTable>;
    componentProps: ComponentProps<TTable>;
    entityNameMappings: EntityNameMappings<TTable>;
    relationships: Relationships<TTable>;
    entityFields: {
        [TField in TableFields<TTable>]: EntityField<TTable, TField>;
    };
};

export type AutomationTableStructure = {
    [TTable in TableKeys]: AutomationTable<TTable>;
};


export type UnifiedSchemaCache = {
    schema: AutomationTableStructure;
    tableNameMap: Map<TableNameVariant, TableName>;
    fieldNameMap: Map<TableName, Map<FieldNameVariant<TableName>, FieldName<TableName>>>;
    reverseTableNameMap: Map<TableName, EntityNameMappings<TableName>>;
    reverseFieldNameMap: {
        [TTable in TableKeys]: {
            [TField in TableFields<TTable>]: FieldNameMappings<TTable, TField>
        }
    };
};

export type UnifiedSchemaCacheTest = {
    schema: AutomationTableStructure;
    tableNameMap: {
        [TVariant in AllTableNameVariations]: TableKeys
    };
    fieldNameMap: {
        [TTable in TableKeys]: {
            [TFieldVariant in FieldNameVariant<TTable>]: FieldName<TTable>
        }
    };
    reverseTableNameMap: {
        [TTable in TableKeys]: EntityNameMappings<TTable>
    };
    reverseFieldNameMap: {
        [TTable in TableKeys]: {
            [TField in TableFields<TTable>]: FieldNameMappings<TTable, TField>
        }
    };
};





// Get all name variations for a specific table
export type TableNameVariations<TTable extends TableKeys> =
    | TTable
    | EntityNameMappings<TTable>[keyof EntityNameMappings<TTable>];

// Get all possible table names across all tables
export type AllTableNameVariations = {
    [TTable in TableKeys]: TableNameVariations<TTable>
}[TableKeys];

// How to get all possible values across all tables (The values for these keys)
export type AllTableNameVariationsValues = TableNameVariations<TableKeys>;

type test11 = TableNameVariations<'registeredFunction'>;
type test11b = AllTableNameVariations;
type test12 = AllTableNameVariationsValues;




// Get all name variations for a specific field
export type FieldNameVariations<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> =
    | TField
    | FieldNameMappings<TTable, TField>[keyof FieldNameMappings<TTable, TField>];

type test13 = FieldNameVariations<'registeredFunction', 'systemFunctionInverse'>;


// Get all field variations for a table (Combines all fields together)
export type AllTableFieldNameVariations<TTable extends TableKeys> = {
    [TField in TableFields<TTable>]: FieldNameVariations<TTable, TField>
}[TableFields<TTable>];

export type FieldVariationToKeyMap<TTable extends TableKeys> = {
    [K in AllTableFieldNameVariations<TTable>]: Extract<TableFields<TTable>, string>;
};

type test14 = AllTableFieldNameVariations<'registeredFunction'>;
type test15 = FieldVariationToKeyMap<'registeredFunction'>;


export type AllFieldNameVariations<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = FieldNameVariations<TTable, TField>;


type test16 = AllFieldNameVariations<'registeredFunction', 'modulePath'>;



// // Then redefine our lookup type
// export type FieldNameLookupType = {
//     [TTable in TableKeys]: Partial<FieldVariationToKeyMap<TTable>>;
// };
//
// // Or alternatively, we could try this approach:
export type FieldNameLookupType = {
    [TTable in TableKeys]: {
        [K: string]: TableFields<TTable>;
    };
};

// Table name lookup
export type TableNameLookupType = {
    [TTable in AllTableNameVariations]: TableKeys;
};

// Consider if PARTIAL is the way to go.
// export type TableNameLookupType = Partial<{
//     [K in AllTableNameVariations]: TableKeys;
// }>;


// Reverse table lookup
export type ReverseTableLookupType = {
    [TTable in TableKeys]: EntityNameMappings<TTable>;
};

// export type ReverseTableLookupType = Partial<{
//     [TTable in TableKeys]: Partial<EntityNameMappings<TTable>>;
// }>;


// Reverse field lookup
export type ReverseFieldLookupType = {
    [TTable in TableKeys]: {
        [TField in TableFields<TTable>]: FieldNameMappings<TTable, TField>
    }
};


export type TableNameVariation<
    TTable extends TableKeys,
    TVariation extends keyof EntityNameMappings<TTable>
> = EntityNameMappings<TTable>[TVariation];

export type TableNameFrontend<TTable extends TableKeys> =
    TableNameVariation<TTable, 'frontend'>;

export type TableNameBackend<TTable extends TableKeys> =
    TableNameVariation<TTable, 'backend'>;

export type TableNameDatabase<TTable extends TableKeys> =
    TableNameVariation<TTable, 'database'>;

export type TableNamePretty<TTable extends TableKeys> =
    TableNameVariation<TTable, 'pretty'>;

export type TableNameComponent<TTable extends TableKeys> =
    TableNameVariation<TTable, 'component'>;

export type TableNameKebab<TTable extends TableKeys> =
    TableNameVariation<TTable, 'kebab'>;

export type TableNameSqlFunctionRef<TTable extends TableKeys> =
    TableNameVariation<TTable, 'sqlFunctionRef'>;

// Optional name format types for tables
export type TableNameRestAPI<TTable extends TableKeys> =
    TableNameVariation<TTable, 'RestAPI'>;

export type TableNameGraphQL<TTable extends TableKeys> =
    TableNameVariation<TTable, 'GraphQL'>;

export type TableNameCustom<TTable extends TableKeys> =
    TableNameVariation<TTable, 'custom'>;

type test10 = TableNameVariation<'registeredFunction', 'database'>;

// FIELDS === Tested and working ========================
export type FieldNameVariation<
    TTable extends TableKeys,
    TField extends TableFields<TTable>,
    TFVariation extends keyof FieldNameMappings<TTable, TField>
> = FieldNameMappings<TTable, TField>[TFVariation];


export type FieldFormatVariation<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = keyof FieldNameMappings<TTable, TField>;

type test6 = FieldNameVariation<'arg', 'registeredFunction', 'frontend'>;
type test5 = FieldFormatVariation<'arg', 'registeredFunction'>;

// ======================================================

export type FieldNameFrontend<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = FieldNameVariation<TTable, TField, 'frontend'>;

type test7 = FieldNameFrontend<'arg', 'registeredFunction'>;


export type FieldNameBackend<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = FieldNameVariation<TTable, TField, 'backend'>;

type test8 = FieldNameBackend<'arg', 'registeredFunction'>;


export type FieldNameDatabase<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = FieldNameVariation<TTable, TField, 'database'>;

export type FieldNamePretty<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = FieldNameVariation<TTable, TField, 'pretty'>;

export type FieldNameComponent<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = FieldNameVariation<TTable, TField, 'component'>;

export type FieldNameKebab<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = FieldNameVariation<TTable, TField, 'kebab'>;

export type FieldNameSqlFunctionRef<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = FieldNameVariation<TTable, TField, 'sqlFunctionRef'>;

// Optional name format types for fields
export type FieldNameRestAPI<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = FieldNameVariation<TTable, TField, 'RestAPI'>;

export type FieldNameGraphQL<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = FieldNameVariation<TTable, TField, 'GraphQL'>;

export type FieldNameCustom<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = FieldNameVariation<TTable, TField, 'custom'>;

export type TableNameFormats<TTable extends TableKeys> = {
    frontend: TableNameFrontend<TTable>;
    backend: TableNameBackend<TTable>;
    database: TableNameDatabase<TTable>;
    pretty: TableNamePretty<TTable>;
    component: TableNameComponent<TTable>;
    kebab: TableNameKebab<TTable>;
    sqlFunctionRef: TableNameSqlFunctionRef<TTable>;
    RestAPI?: TableNameRestAPI<TTable>;
    GraphQL?: TableNameGraphQL<TTable>;
    custom?: TableNameCustom<TTable>;
};

// Object containing all variations of a field name
export type FieldNameFormats<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = {
    frontend: FieldNameFrontend<TTable, TField>;
    backend: FieldNameBackend<TTable, TField>;
    database: FieldNameDatabase<TTable, TField>;
    pretty: FieldNamePretty<TTable, TField>;
    component: FieldNameComponent<TTable, TField>;
    kebab: FieldNameKebab<TTable, TField>;
    sqlFunctionRef: FieldNameSqlFunctionRef<TTable, TField>;
    RestAPI?: FieldNameRestAPI<TTable, TField>;
    GraphQL?: FieldNameGraphQL<TTable, TField>;
    custom?: FieldNameCustom<TTable, TField>;
};

// Combined type that represents both table and field name formats
export type TableFieldNameFormats<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = {
    table: TableNameFormats<TTable>;
    field: FieldNameFormats<TTable, TField>;
};

// Example usage:
type test2 = TableFieldNameFormats<'arg', 'registeredFunction'>;




export type ProcessedSchema = UnifiedSchemaCache['schema'];

export type TableNames = keyof ProcessedSchema;


export type TableNameMap = ReadonlyMap<AllTableNameVariations, AutomationTableName>;

export type FieldNameMap = ReadonlyMap<
    AutomationTableName,
    ReadonlyMap<AllTableFieldNameVariations<AutomationTableName>, keyof TableFields<AutomationTableName>>
>;
export type ReverseTableNameMap = ReadonlyMap<AutomationTableName, ReadonlySet<AllTableNameVariations>>;
export type ReverseFieldNameMap = ReadonlyMap<
    AutomationTableName,
    ReadonlyMap<keyof TableFields<AutomationTableName>, ReadonlySet<AllTableFieldNameVariations<AutomationTableName>>>
>;

export type TableName = TableKeys;
export type AnyTableKey = TableKeys;

export type FieldName<TTable extends TableName> = TableFields<TTable>;
export type AnyFieldKey = FieldName<AnyTableKey>;

export type TableNameVariant = AllTableNameVariations;
export type AnyTableNameVariant = TableNameVariant;

export type FieldNameVariant<TTable extends TableName> = AllTableFieldNameVariations<TTable>;
export type AnyFieldNameVariant = FieldNameVariant<TableName>;

export type NameFormatType = keyof EntityNameMappings<TableName>;
export type TableNameFormat = NameFormatType;




// I don't think this is accurate ---
export type FieldKey<TTable extends TableName> = TableFields<TTable>;
export type FieldNameFormatType<TTable extends TableKeys, TField extends FieldKey<TTable>> = keyof FieldNameMappings<TTable, TField>;
// ---


export type testFieldFormat = FieldNameFormatType<'registeredFunction', 'modulePath'>;


type test1 = FieldNameMappings<'arg', 'registeredFunction'>;


type RegisteredFunctionTest2 = AutomationTableStructure['registeredFunction'];
type RegisteredFunctionTest3 = AutomationTableStructure['registeredFunction']['entityFields'];
type RegisteredFunctionTest4 = AutomationTableStructure['registeredFunction']['entityFields']['id'];
type RegisteredFunctionTest5 = AutomationTableStructure['registeredFunction']['entityFields']['modulePath']['dataType'];
type RegisteredFunctionTest6 = AutomationTableStructure['registeredFunction']['entityFields']['modulePath']['isRequired'];
type RegisteredFunctionTest7 = AutomationTableStructure['registeredFunction']['entityFields']['modulePath']['fieldNameMappings'];
type RegisteredFunctionTest8 = AutomationTableStructure['registeredFunction']['entityFields']['modulePath']['fieldNameMappings']['frontend'];
type RegisteredFunctionTest9 = AutomationTableStructure['action']['defaultFetchStrategy']

type testEntityNameMappings = EntityNameMappings<'registeredFunction'>;
type relationshipTest = AutomationTableStructure['registeredFunction']['relationships']
type NameVariationTest = AllTableNameVariations;
type FieldNameVariationTest = AllTableFieldNameVariations<'registeredFunction'>;
type TableNameLookupTest = TableNameLookupType;
type FieldNameLookupTest = FieldNameLookupType;
type ReverseTableLookupTest = ReverseTableLookupType;
type ReverseFieldLookupTest = ReverseFieldLookupType;
type ModulePathFrontendName = FieldNameFrontend<'registeredFunction', 'modulePath'>;
type ModulePathDatabaseName = FieldNameDatabase<'registeredFunction', 'modulePath'>;
type RegisteredFunctionFrontendName = TableNameFrontend<'registeredFunction'>;
type RegisteredFunctionDatabaseName = TableNameDatabase<'registeredFunction'>;


// Type to extract only single-structure fields
export type SingleStructureFields<TTable extends TableKeys> = {
    [K in TableFields<TTable>]: FieldStructure<TTable, K> extends 'single' ? K : never
}[TableFields<TTable>];

// Type for the field information we want to keep
type FilteredEntityField<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = {
    fieldNameMappings: FieldNameMappings<TTable, TField>;
    typeReference: FieldTypeReference<TTable, TField>;
};

// Filtered table structure that only includes single-structure fields
export type FilteredAutomationTable<TTable extends TableKeys> = {
    entityNameMappings: EntityNameMappings<TTable>;
    entityFields: {
        [K in SingleStructureFields<TTable>]: FilteredEntityField<TTable, K>;
    };
};

// The complete structure
export type FilteredAutomationTableStructure = {
    [K in TableKeys]: FilteredAutomationTable<K>;
};

// Helper type to extract the type reference for a specific field
export type ExtractFieldTypeReference<
    TTable extends TableKeys,
    TField extends SingleStructureFields<TTable>
> = FilteredAutomationTableStructure[TTable]['entityFields'][TField]['typeReference'];


// Generate table types
export type GenerateTableType<TTable extends TableKeys> = {
    [K in SingleStructureFields<TTable>]: ExtractType<
        ExtractFieldTypeReference<TTable, K>
    >
};


// Generate all table types
export type GenerateAllTableTypes = {
    [K in TableKeys]: GenerateTableType<K>
};


// Example usage types
type testA1 = FilteredAutomationTableStructure;
type testA2<T extends TableKeys> = SingleStructureFields<T>;
type testA3<T extends TableKeys, F extends SingleStructureFields<T>> = ExtractFieldTypeReference<T, F>;
type testA1A = SingleStructureFields<'registeredFunction'>;
type testA2A = FilteredAutomationTable<'registeredFunction'>;
type testA3A = ExtractFieldTypeReference<'registeredFunction', 'modulePath'>;

type RegisteredFunction = GenerateTableType<'registeredFunction'>;
type Broker = GenerateTableType<'broker'>;
type Action = GenerateTableType<'action'>;
type AiEndpoint = GenerateTableType<'aiEndpoint'>;
type AiModel = GenerateTableType<'aiModel'>;
type Arg = GenerateTableType<'arg'>;
type AutomationBoundaryBroker = GenerateTableType<'automationBoundaryBroker'>;
type AllTableTypes = GenerateAllTableTypes;


// Type to map a field to its formatted name for a specific variation
type FormattedFieldName<
    TTable extends TableKeys,
    TField extends SingleStructureFields<TTable>,
    TVariation extends keyof FieldNameFormats<TTable, TField>
> = FieldNameVariation<TTable, TField, TVariation>;

// Generate table type with specific name formatting
export type GenerateFormattedTableType<
    TTable extends TableKeys,
    TVariation extends keyof FieldNameFormats<TTable, SingleStructureFields<TTable>>
> = {
    [K in SingleStructureFields<TTable> as FormattedFieldName<TTable, K, TVariation>]: ExtractType<
        ExtractFieldTypeReference<TTable, K>
    >
};

// Specific format types
export type FrontendTableType<TTable extends TableKeys> = GenerateFormattedTableType<TTable, 'frontend'>;
export type BackendTableType<TTable extends TableKeys> = GenerateFormattedTableType<TTable, 'backend'>;
export type DatabaseTableType<TTable extends TableKeys> = GenerateFormattedTableType<TTable, 'database'>;
export type PrettyTableType<TTable extends TableKeys> = GenerateFormattedTableType<TTable, 'pretty'>;
export type ComponentTableType<TTable extends TableKeys> = GenerateFormattedTableType<TTable, 'component'>;
export type KebabTableType<TTable extends TableKeys> = GenerateFormattedTableType<TTable, 'kebab'>;
export type SqlFunctionRefTableType<TTable extends TableKeys> = GenerateFormattedTableType<TTable, 'sqlFunctionRef'>;
export type RestAPITableType<TTable extends TableKeys> = GenerateFormattedTableType<TTable, 'RestAPI'>;
export type GraphQLTableType<TTable extends TableKeys> = GenerateFormattedTableType<TTable, 'GraphQL'>;
export type CustomTableType<TTable extends TableKeys> = GenerateFormattedTableType<TTable, 'custom'>;

export type FormattedTableSchema<TTable extends TableKeys, TFormat extends NameFormatType> =
    TFormat extends 'frontend'
    ? FrontendTableType<TTable>
    : TFormat extends 'backend'
      ? BackendTableType<TTable>
      : TFormat extends 'database'
        ? DatabaseTableType<TTable>
        : TFormat extends 'pretty'
          ? PrettyTableType<TTable>
          : TFormat extends 'component'
            ? ComponentTableType<TTable>
            : TFormat extends 'kebab'
              ? KebabTableType<TTable>
              : TFormat extends 'sqlFunctionRef'
                ? SqlFunctionRefTableType<TTable>
                : TFormat extends 'RestAPI'
                  ? RestAPITableType<TTable>
                  : TFormat extends 'GraphQL'
                    ? GraphQLTableType<TTable>
                    : TFormat extends 'custom'
                      ? CustomTableType<TTable>
                      : never;


// Generate all tables with specific formatting
export type GenerateAllFrontendTableTypes = {
    [K in TableKeys as TableNameFrontend<K>]: FrontendTableType<K>
};
export type GenerateAllBackendTableTypes = {
    [K in TableKeys as TableNameBackend<K>]: BackendTableType<K>
};
export type GenerateAllDatabaseTableTypes = {
    [K in TableKeys as TableNameDatabase<K>]: DatabaseTableType<K>
};
export type GenerateAllPrettyTableTypes = {
    [K in TableKeys as TableNamePretty<K>]: PrettyTableType<K>
};
export type GenerateAllComponentTableTypes = {
    [K in TableKeys as TableNameComponent<K>]: ComponentTableType<K>
};
export type GenerateAllKebabTableTypes = {
    [K in TableKeys as TableNameKebab<K>]: KebabTableType<K>
};
export type GenerateAllSqlFunctionRefTableTypes = {
    [K in TableKeys as TableNameSqlFunctionRef<K>]: SqlFunctionRefTableType<K>
};
export type GenerateAllRestAPITableTypes = {
    [K in TableKeys as TableNameRestAPI<K>]: RestAPITableType<K>
};
export type GenerateAllGraphQLTableTypes = {
    [K in TableKeys as TableNameGraphQL<K>]: GraphQLTableType<K>
};
export type GenerateAllCustomTableTypes = {
    [K in TableKeys as TableNameCustom<K>]: CustomTableType<K>
};

// Example usage:
type RegisteredFunctionFrontend = FrontendTableType<'registeredFunction'>;
type RegisteredFunctionDatabase = DatabaseTableType<'registeredFunction'>;
type AllFrontendTypes = GenerateAllFrontendTableTypes;
type AllDatabaseTypes = GenerateAllDatabaseTableTypes;


//export type TableFieldNames<T extends AutomationTableName> = keyof AutomationTableStructure[T]['entityFields'];

// export type FieldVariantMap<T extends AutomationTableName> = ReadonlyMap<
//     AllTableFieldNameVariations<T>,
//     keyof TableFields<T>
// >;
//
// export function fieldName<
//     T extends AutomationTableName,
//     F extends keyof AutomationTableStructure[T]['entityFields']
// >(table: T, field: F): F {
//     return field;
// }
//
// export function tableName<T extends AutomationTableName>(table: T): T {
//     return table;
// }
//
//
// export type TableField<
//     T extends AutomationTableName,
//     F extends TableFieldNames<T>
// > = AutomationTableStructure[T]['entityFields'][F];
//
//
//
// // Cache-aware type utilities
// export type CachedTableName = UnifiedSchemaCache['tableNameMap'] extends Map<infer K, any> ? K : never;
// export type CachedFieldName<T extends AutomationTableName> =
//     UnifiedSchemaCache['fieldNameMap'] extends Map<T, Map<infer F, any>> ? F : never;
//
// // Type guard utilities
// export type TypeGuardedTable<T extends AutomationTableName> = {
//     readonly [K in keyof AutomationTableStructure[T]]: AutomationTableStructure[T][K];
// };
//
//
//
// // Combined table name types
// export type RequiredTableNames<T extends AutomationTableName> =
//     | TableNameFrontend<T>
//     | TableNameBackend<T>
//     | TableNameDatabase<T>
//     | TableNamePretty<T>
//     | TableNameComponent<T>
//     | TableNameKebab<T>
//     | TableNameSqlFunctionRef<T>;
//
// export type OptionalTableNames<T extends AutomationTableName> =
//     | TableNameRestAPI<T>
//     | TableNameGraphQL<T>
//     | TableNameCustom<T>;
//
// export type AnyTableName<T extends AutomationTableName> =
//     | RequiredTableNames<T>
//     | OptionalTableNames<T>;


export type EntityData = Record<string, any>;

export type EntitySliceState = {
    data: EntityData[]; // This holds the actual values, where each object represents a row (record) in the entity
    totalCount: number; // Total number of records in the entity (e.g., number of books)
    allPkAndDisplayFields: Array<{
        pk: any;
        display?: any;
    }>;
    loading: boolean; // Loading state
    error: string | null; // Error state
    lastFetched: Record<string, Date>; // Time when data was last fetched
    staleTime: number; // Time-to-live for data freshness
    backups: Record<string, EntityData[]>; // Backup of previous data states
    selectedItem: EntityData | null; // Currently selected item
};


export type AutomationView = {
    schemaType: 'view';
    entityNameMappings: {
        frontend: string;
        backend: string;
        database: string;
        pretty: string;
        component: string;
        sqlFunctionRef: string;
        [key: string | string]: string;
    };
    entityFields: {
        [fieldName: string]: {
            fieldNameMappings: {
                [fieldName: string]: {
                    frontend: string;
                    backend: string;
                    database: string;
                    pretty: string;
                    component: string;
                    sqlFunctionRef: string;
                    [key: string | string]: string;
                };
            };
            value: any;
            dataType: FieldDataOptionsType;
            isArray: boolean;
            structure: DataStructure;
            isNative: boolean;
            typeReference: TypeBrand<any>;
            defaultComponent?: string;
            componentProps?: Record<string, unknown>;
            isRequired: boolean;
            maxLength: number | null;
            defaultValue: any;
            isPrimaryKey: boolean;
            isDisplayField: boolean;
            defaultGeneratorFunction: string | null;
            validationFunctions: readonly string[];
            exclusionRules: readonly string[];
            databaseTable: string;
        };
    };
    defaultFetchStrategy: FetchStrategy;
    componentProps: Record<string, unknown>;
    relationships: Array<{
        relationshipType: 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
        column: string;
        relatedTable: string;
        relatedColumn: string;
        junctionTable: string | null;
    }>;
};


export type SampleSchema = {
    [TTable in TableKeys]: {
        schemaType: 'table';
        defaultFetchStrategy: "m2mAndFk" | "simple" | "m2mAndIfk" | "fk" | "none" | "fkIfkAndM2M" | "ifk" | "fkAndIfk" | "m2m";
        componentProps: Record<string, unknown>;
        entityNameMappings: Record<string, string>;
        entityFields: {
            [TField in EntityFieldKeys]: {
                structure: DataStructure;
                typeReference: TypeBrand<any>;
                dataType: "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function" | "date" | "map";
                isRequired: boolean;
                defaultValue: any;
                isPrimaryKey: boolean;
                isDisplayField: boolean;
                fieldNameMappings: Record<string, string>;
                value: any;
                defaultGeneratorFunction: string | null;
                databaseTable: string;
            };
        };
        relationships: Array<{
            relationshipType: 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
            column: string;
            relatedTable: string;
            relatedColumn: string;
            junctionTable: string | null;
        }>;
    };
};


type SampleTable = {
    schemaType: 'table';
    defaultFetchStrategy: "m2mAndFk" | "simple" | "m2mAndIfk" | "fk" | "none" | "fkIfkAndM2M" | "ifk" | "fkAndIfk" | "m2m";
    componentProps: Record<string, unknown>;
    entityNameMappings: Record<string, string>;
    entityFields: {
        [fieldName: string]: {
            structure: DataStructure;
            typeReference: TypeBrand<any>;
            dataType: "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function" | "date" | "map";
            isRequired: boolean;
            defaultValue: any;
            isPrimaryKey: boolean;
            isDisplayField: boolean;
            fieldNameMappings: Record<string, string>;
            value: any;
            defaultGeneratorFunction: string | null;
            databaseTable: string;
        };
    };

    relationships: Array<{
        relationshipType: 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
        column: string;
        relatedTable: string;
        relatedColumn: string;
        junctionTable: string | null;
    }>;
};

