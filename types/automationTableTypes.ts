import {
    AutomationTableName,
    DataStructure,
    FetchStrategy,
    NameFormat, TypeBrand,
} from "@/types/AutomationSchemaTypes";
import {initialAutomationTableSchema} from "@/utils/schema/initialSchemas";

export type ExtractType<T> = T extends TypeBrand<infer U> ? U : T;


export type EntityFieldKeysForTable<TTable extends keyof InitialSchema> = InitialSchema[TTable] extends infer T
    ? T extends { entityFields: any }
        ? keyof T['entityFields']
        : never
    : never;

export type InitialSchema = typeof initialAutomationTableSchema;
export type TableStructure<T extends TableKeys> = InitialSchema[T];
export type TableEntityFields<T extends TableKeys> = TableStructure<T>['entityFields'];

export type TableFieldKeys<T extends TableKeys> = keyof TableEntityFields<T>;


export type TableSchemaType = TableSchema['schemaType'];
export type TableEntityNameVariations = TableSchema['entityNameVariations'];
export type TableEntityNameVariationsValues = TableEntityNameVariations[keyof TableEntityNameVariations];
export type IndividualTableKeys = keyof TableSchema;
export type EntityFields = TableSchema['entityFields'];

export type EntityFieldKeys = InitialSchema[keyof InitialSchema] extends infer T
    ? T extends { entityFields: any }
        ? keyof T['entityFields']
        : never
    : never;

export type TableSchema = InitialSchema[keyof InitialSchema];
export type TableKeys = keyof InitialSchema;

export type TableFields<TTable extends keyof InitialSchema> = InitialSchema[TTable] extends infer T
    ? T extends { entityFields: any }
        ? keyof T['entityFields']
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
    entityNameMappings: EntityNameMappings<TTable>;
    entityFields: {
        [K in TableFields<TTable>]: EntityField<TTable, K>;
    };
    defaultFetchStrategy: DefaultFetchStrategy<TTable>;
    componentProps: ComponentProps<TTable>;
    relationships: Relationships<TTable>;
};

export type AutomationTableStructure = {
    [K in TableKeys]: AutomationTable<K>;
};

// Get all name variations for a specific table
export type TableNameVariations<TTable extends TableKeys> =
    | TTable
    | EntityNameMappings<TTable>[keyof EntityNameMappings<TTable>];

// Get all possible table names across all tables
export type AllTableNameVariations = {
    [TTable in TableKeys]: TableNameVariations<TTable>
}[TableKeys];

// Get all name variations for a specific field
export type FieldNameVariations<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> =
    | TField
    | FieldNameMappings<TTable, TField>[keyof FieldNameMappings<TTable, TField>];

// Get all field variations for a table
export type AllFieldNameVariations<TTable extends TableKeys> = {
    [TField in TableFields<TTable>]: FieldNameVariations<TTable, TField>
}[TableFields<TTable>];

export type FieldVariationToKeyMap<TTable extends TableKeys> = {
    [K in AllFieldNameVariations<TTable>]: Extract<TableFields<TTable>, string>;
};

// Then redefine our lookup type
export type FieldNameLookupType = {
    [TTable in TableKeys]: Partial<FieldVariationToKeyMap<TTable>>;
};

// // Or alternatively, we could try this approach:
// export type FieldNameLookupType = {
//     [TTable in TableKeys]: {
//         [K: string]: TableFields<TTable>;
//     };
// };

// Table name lookup
export type TableNameLookupType = {
    [K in AllTableNameVariations]: TableKeys;
};


// Reverse table lookup
export type ReverseTableLookupType = {
    [TTable in TableKeys]: EntityNameMappings<TTable>;
};

// Reverse field lookup
export type ReverseFieldLookupType = {
    [TTable in TableKeys]: {
        [TField in TableFields<TTable>]: FieldNameMappings<TTable, TField>;
    };
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


export type FieldNameVariation<
    TTable extends TableKeys,
    TField extends TableFields<TTable>,
    TVariation extends keyof FieldNameMappings<TTable, TField>
> = FieldNameMappings<TTable, TField>[TVariation];


export type FieldNameFrontend<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = FieldNameVariation<TTable, TField, 'frontend'>;

export type FieldNameBackend<
    TTable extends TableKeys,
    TField extends TableFields<TTable>
> = FieldNameVariation<TTable, TField, 'backend'>;

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


export type UnifiedSchemaCache = {
    schema: AutomationTableStructure;
    tableNameMap: Map<TableNameVariant, TableName>;
    fieldNameMap: Map<TableName, Map<string, FieldName<TableName>>>;
    reverseTableNameMap: Map<TableName, EntityNameMappings<TableName>>;
    reverseFieldNameMap: Map<TableName, Map<FieldName<TableName>, FieldNameMappings<TableName, FieldName<TableName>>>>;
};

export type ProcessedSchema = UnifiedSchemaCache['schema'];

export type TableNames = keyof ProcessedSchema;


export type TableNameMap = ReadonlyMap<AllTableNameVariations, AutomationTableName>;

export type FieldNameMap = ReadonlyMap<
    AutomationTableName,
    ReadonlyMap<AllFieldNameVariations<AutomationTableName>, keyof TableFields<AutomationTableName>>
>;
export type ReverseTableNameMap = ReadonlyMap<AutomationTableName, ReadonlySet<AllTableNameVariations>>;
export type ReverseFieldNameMap = ReadonlyMap<
    AutomationTableName,
    ReadonlyMap<keyof TableFields<AutomationTableName>, ReadonlySet<AllFieldNameVariations<AutomationTableName>>>
>;

export type TableName = TableKeys;
export type FieldName<T extends TableName> = TableFields<T>;
export type TableNameVariant = AllTableNameVariations;
export type FieldNameVariant<T extends TableName> = AllFieldNameVariations<T>;
export type NameFormatType = keyof EntityNameMappings<TableName>;



type RegisteredFunctionTest2 = AutomationTableStructure['registeredFunction'];
type RegisteredFunctionTest3 = AutomationTableStructure['registeredFunction']['entityFields'];
type RegisteredFunctionTest4 = AutomationTableStructure['registeredFunction']['entityFields']['id'];
type RegisteredFunctionTest5 = AutomationTableStructure['registeredFunction']['entityFields']['modulePath']['dataType'];
type RegisteredFunctionTest6 = AutomationTableStructure['registeredFunction']['entityFields']['modulePath']['isRequired'];
type RegisteredFunctionTest7 = AutomationTableStructure['registeredFunction']['entityFields']['modulePath']['fieldNameMappings'];
type RegisteredFunctionTest8 = AutomationTableStructure['registeredFunction']['entityFields']['modulePath']['fieldNameMappings']['frontend'];
type RegisteredFunctionTest9 = AutomationTableStructure['action']['defaultFetchStrategy']
type TestTableFieldNameMappings = FieldNameMappings<'arg', 'registeredFunction'>;
type testEntityNameMappings = EntityNameMappings<'registeredFunction'>;
type relationshipTest = AutomationTableStructure['registeredFunction']['relationships']
type NameVariationTest = AllTableNameVariations;
type FieldNameVariationTest = AllFieldNameVariations<'registeredFunction'>;
type TableNameLookupTest = TableNameLookupType;
type FieldNameLookupTest = FieldNameLookupType;
type ReverseTableLookupTest = ReverseTableLookupType;
type ReverseFieldLookupTest = ReverseFieldLookupType;
type ModulePathFrontendName = FieldNameFrontend<'registeredFunction', 'modulePath'>;
type ModulePathDatabaseName = FieldNameDatabase<'registeredFunction', 'modulePath'>;
type RegisteredFunctionFrontendName = TableNameFrontend<'registeredFunction'>;
type RegisteredFunctionDatabaseName = TableNameDatabase<'registeredFunction'>;


//export type TableFieldNames<T extends AutomationTableName> = keyof AutomationTableStructure[T]['entityFields'];

// export type FieldVariantMap<T extends AutomationTableName> = ReadonlyMap<
//     AllFieldNameVariations<T>,
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
            dataType: FieldDataType;
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



