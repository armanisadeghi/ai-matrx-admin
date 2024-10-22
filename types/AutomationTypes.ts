import {automationTableSchema, automationviewSchemas} from "@/utils/schema/initialSchemas";
import {
    NameFormat,
    AutomationTableName,
    AutomationViewName,
    AutomationDynamicName,
    AutomationCustomName,
    DataStructure,
    FieldDataType,
    FetchStrategy, RequiredNameFormats, OptionalNameFormats
} from "@/types/AutomationSchemaTypes";


export type AutomationEntityName =
    AutomationTableName
    | AutomationViewName
    | AutomationDynamicName
    | AutomationCustomName;

// Utility types
export type TypeBrand<T> = { _typeBrand: T };
export type UnwrapTypeBrand<T> = T extends TypeBrand<infer U> ? U : T;
type Merge<T, U> = Omit<T, keyof U> & U;


export type NameVariations = {
    [K in RequiredNameFormats]: string;
} & {
    [K in OptionalNameFormats]?: string;
} & {
    [key: string]: string;
};

export type TableNameVariations = {
    [K in AutomationTableName]: NameVariations;
};

export type AnyTableNameVariation<T extends AutomationTableName> = TableNameVariations[T][NameFormat];

// Field types
export type BaseField<T = any> = {
    fieldNameVariations: NameVariations;
    dataType: FieldDataType;
    isArray: boolean;
    structure: DataStructure;
    isNative: boolean;
    typeReference: TypeBrand<T>;
    defaultComponent?: string;
    componentProps?: Record<string, unknown>;
};

export type TableField<T = any> = BaseField<T> & {
    isRequired?: boolean;
    maxLength?: number | null;
    defaultValue?: T;
    isPrimaryKey?: boolean;
    defaultGeneratorFunction?: string | null;
    validationFunctions?: readonly string[];
    exclusionRules?: readonly string[];
    databaseTable?: AnyTableNameVariation<AutomationTableName>;
    sqlFunctionRef?: string;
};

export type ViewField<T = any> = BaseField<T> & {
    excludeFromFetch?: boolean;
    hideFromUser?: boolean;
    databaseTable?: AnyTableNameVariation<AutomationTableName>;
};

// Schema types
export type BaseEntitySchema<T extends AutomationEntityName, Fields extends Record<string, BaseField>> = {
    schemaType: T extends AutomationTableName ? 'table'
    : T extends AutomationViewName ? 'view'
    : T extends AutomationDynamicName ? 'dynamic'
    : T extends AutomationCustomName ? 'custom'
    : never;
    entityFields: Fields;
    defaultFetchStrategy: FetchStrategy;
    entityNameVariations: NameVariations;
    fieldNameMappings?: Record<string, Partial<Record<NameFormat, string>>>;
    precomputedFormats?: Partial<Record<NameFormat, TableSchema<AutomationTableName>>>;
    componentProps?: Record<string, unknown>;
};

export type TableSchema<T extends AutomationTableName> = BaseEntitySchema<T, Record<string, TableField>> & {
    schemaType: 'table';
    relationships: Array<Relationship>;
};

export type ViewSchema<T extends AutomationViewName> = BaseEntitySchema<T, Record<string, ViewField>> & {
    schemaType: 'view';
    defaultFetchStrategy: 'simple';
};

export type DynamicSchema<T extends AutomationDynamicName> = BaseEntitySchema<T, Record<string, BaseField>> & {
    schemaType: 'dynamic';
    defaultFetchStrategy?: 'none';
};

export type CustomSchema<T extends AutomationCustomName> = BaseEntitySchema<T, Record<string, BaseField>> & {
    schemaType: 'custom';
    defaultFetchStrategy?: 'none';
};

// Relationship type
export type Relationship = {
    relationshipType: 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
    column: string;
    relatedTable: string;
    relatedColumn: string;
    junctionTable: string | null;
};

export type AnySchema =
    | TableSchema<AutomationTableName>
    | ViewSchema<AutomationViewName>
    | DynamicSchema<AutomationDynamicName>
    | CustomSchema<AutomationCustomName>;


// AutomationSchema type
export type AutomationSchema = {
    [K in AutomationTableName]: TableSchema<K>;
} & {
    [K in AutomationViewName]: ViewSchema<K>;
} & {
    [K in AutomationDynamicName]: DynamicSchema<K>;
} & {
    [K in AutomationCustomName]: CustomSchema<K>;
};

type ExpandFetchStrategy<T> = T extends FetchStrategy ? T : never;

type ExpandNameVariations<T> = T extends NameVariations ? T : never;

type ExpandFieldNameMappings<T> = T extends Record<string, Partial<Record<NameFormat, string>>> ? T : never;

type ExpandFields<T extends Record<string, BaseField>> = {
    [K in keyof T]: UnwrapTypeBrand<T[K]['typeReference']>;
};

// Utility types for expanding schemas
type ExpandField<F> = F extends BaseField ? {
    [K in keyof F]: K extends 'typeReference' ? UnwrapTypeBrand<F[K]> : F[K]
} : never;

type ExpandEntityFields<T extends Record<string, BaseField>> = {
    [K in keyof T]: ExpandField<T[K]>;
};

type ExpandSchema<T extends AnySchema> = {
    [K in keyof T]: K extends 'entityFields'
        ? ExpandEntityFields<T[K]>
        : K extends 'relationships'
            ? T[K] extends Array<infer R>
                ? Array<{[P in keyof R]: R[P]}>
                : T[K]
        : K extends 'defaultFetchStrategy'
            ? ExpandFetchStrategy<T[K]>
        : K extends 'entityNameVariations'
            ? ExpandNameVariations<T[K]>
        : K extends 'fieldNameMappings'
            ? ExpandFieldNameMappings<T[K]>
        : T[K];
};

// Merged schema types
export type ExpandedTableSchema<T extends AutomationTableName> = ExpandSchema<TableSchema<T>>;
export type ExpandedViewSchema<T extends AutomationViewName> = ExpandSchema<ViewSchema<T>>;
export type ExpandedDynamicSchema<T extends AutomationDynamicName> = ExpandSchema<DynamicSchema<T>>;
export type ExpandedCustomSchema<T extends AutomationCustomName> = ExpandSchema<CustomSchema<T>>;

// Full AutomationSchema with expanded types
export type FullAutomationSchema = {
    [K in AutomationTableName]: ExpandedTableSchema<K>;
} & {
    [K in AutomationViewName]: ExpandedViewSchema<K>;
} & {
    [K in AutomationDynamicName]: ExpandedDynamicSchema<K>;
} & {
    [K in AutomationCustomName]: ExpandedCustomSchema<K>;
};

// Helper types for precise entity types and name variations
export type AutomationType<K extends keyof FullAutomationSchema> = FullAutomationSchema[K];

export type TableNameVariation<T extends AutomationTableName> = FullAutomationSchema[T]['entityNameVariations'][NameFormat];

export type FieldNameVariation<T extends keyof FullAutomationSchema, F extends keyof FullAutomationSchema[T]['entityFields']> =
    FullAutomationSchema[T]['entityFields'][F]['fieldNameVariations'][RequiredNameFormats] |
    (FullAutomationSchema[T]['entityFields'][F]['fieldNameVariations'][OptionalNameFormats] extends string ? FullAutomationSchema[T]['entityFields'][F]['fieldNameVariations'][OptionalNameFormats] : never);


export type TableSchemaStructure = {
    [K in AutomationTableName]: AutomationType<K>;
};

export type ViewSchemaStructure = {
    [K in AutomationViewName]: AutomationType<K>;
};

export type DynamicSchemaStructure = {
    [K in AutomationDynamicName]: AutomationType<K>;
};

export type CustomSchemaStructure = {
    [K in AutomationCustomName]: AutomationType<K>;
};

// Full schema structure (combination of all)
export type FullSchemaStructure =
    TableSchemaStructure &
    ViewSchemaStructure &
    DynamicSchemaStructure &
    CustomSchemaStructure;


