// selectorsConfig.ts
import * as schemaSelectors from "@/lib/redux/schema/globalCacheSelectors";
import {EntityKeys} from "@/types/entityTypes";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";


const entityKey = 'registeredFunction';
const entityAlias = 'registered-function'
const fieldKey = 'modulePath'; // Replace with a valid field key
const fieldKey2 = 'className'; // Replace with a valid field key
const fieldKey3 = 'name'; // Replace with a valid field key
const wrongFieldKey = 'not-valid_but-should_see'; // Replace with a valid field key
const modulePathValue = "sampleModulePath"; // Replace with a valid module path
const classNameValue = "sampleClassName"; // Replace with a valid class name

const sampleData = [{[fieldKey]: "value1"}, {[fieldKey2]: "value2"}]; // Sample data structure

const sampleDataTwo = [{[fieldKey]: "value1"}, {[fieldKey2]: "value2"}, {['p_module_path']: "value1"}, {["class_name"]: "value2"}, {['module-path']: "value1"}, {["p_class_name"]: "value2"}]; // Sample data structure
const sampleDataThree = [{[fieldKey]: "value1"}, {[fieldKey2]: "value2"}, {['p_module_path']: "value1"}, {["class_name"]: "value2"}, {['module-path']: "value1"}, {["p_class_name"]: "value2"}]; // Sample data structure

export type QueryOptions<TEntity extends EntityKeys> = {
    tableName: string; // Table name as a plain string
    filters?: Partial<Record<string, any>>; // Filters use string for field names
    sorts?: Array<{
        column: string; // Column names are strings
        ascending?: boolean;
    }>;
    limit?: number;
    offset?: number;
    columns?: Array<string>; // Column names as strings
};

type FlexibleQueryOptions<TEntity extends EntityKeys> = Partial<QueryOptions<TEntity>> & {
    joinTables?: Array<{
        table: string;
        on: string; // Join condition, e.g., 'user_id = id'
    }>;
    groupBy?: Array<string>;
    having?: Record<string, any>; // Condition for group-based filtering
    fullTextSearch?: {
        column: string;
        query: string;
    };
    upsertConflictColumns?: Array<string>; // Columns to identify conflicts during upsert
    range?: {
        start: number;
        end: number;
    };
    distinct?: boolean;
};


const queryOptions = {
    tableName: entityKey,
    filters: {[fieldKey]: "some random filter value"},
    sorts: [{column: fieldKey2, ascending: true}, {column: fieldKey3, ascending: true}],
    columns: ["returnBroker", "should-remain-kabob", wrongFieldKey],
    limit: 10,
    offset: 0,
};

const flexibleQuery: FlexibleQueryOptions<"registeredFunction"> = {
    tableName: "registeredFunction",
    filters: {status: "active"},
    sorts: [{column: "created_at", ascending: false}],
    columns: ["id", "name"],
    limit: 20,
    joinTables: [{table: "Orders", on: "user_id = id"}],
    groupBy: ["status"],
    having: {"count": {">": 1}},
    fullTextSearch: {column: "bio", query: "developer"},
    range: {start: 0, end: 50},
    distinct: true,
};

type UnifiedQueryOptions<TEntity extends EntityKeys> = Partial<{
    tableName: TEntity; // The main table to query from
    filters: Partial<Record<string, any>>; // Field-based filters
    sorts: Array<{ column: string; ascending?: boolean }>; // Sort options for columns
    columns: Array<string>; // Columns to return in the result set
    limit: number; // Limit number of rows returned
    offset: number; // Skip a number of rows for pagination
    distinct: boolean; // To return only unique rows

    // Pagination controls
    range: {
        start: number;
        end: number;
    };

    // Full-text search support
    fullTextSearch: {
        column: string;
        query: string;
    };

    // Relationships (joins)
    joinTables: Array<{
        table: string; // The related table to join
        on: string; // Join condition, e.g., 'user_id = id'
        columns?: Array<string>; // Columns from the joined table to include
    }>;

    // Grouping and aggregate filtering
    groupBy: Array<string>; // Fields to group by
    having: Partial<Record<string, any>>; // Aggregate condition filters after grouping

    // Upsert and conflict handling
    upsertConflictColumns: Array<string>; // Columns to identify conflicts during upserts
}>;

const unifiedQuery: UnifiedQueryOptions<"registeredFunction"> = {
    tableName: entityKey,
    filters: {[fieldKey]: "some random filter value"},
    sorts: [{column: fieldKey2, ascending: true}, {column: fieldKey3, ascending: true}],
    columns: ["returnBroker", "should-remain-kabob", wrongFieldKey, 'brokerReference'],
    limit: 10,
    offset: 0,
    distinct: true,

    // Pagination range
    range: {
        start: 0,
        end: 50,
    },

    // Full-text search setup
    fullTextSearch: {
        column: "fieldKey3",
        query: "developer",
    },

    // Relationship joins
    joinTables: [
        {
            table: "systemFunction",
            on: "user_id = id",
            columns: ["inputParams", "outputOptions", "rfId"],
        },
    ],

    // Grouping and having conditions
    groupBy: ["returnBroker"],
    having: {count: {">": 1}},

    // Conflict handling for upsert
    upsertConflictColumns: ["brokerReference"],
};


const dataObject = [
    {
        "modulePath": "value1"
    },
    {
        "className": "value2"
    }
];

const sampleKeyMapping = {
    "modulePath": "p_module_path",
    "className": "class_name"
};


const formatOne = "kebab";
const formatTwo = "component";
const formatThree = "pretty";
const formatFour = "GraphQL";


export const KeyedSelectorsConfig = [
    {
        category: "Entity Selectors",
        name: "selectAllRecords",
        selectorFn: (state, entityKey) => createEntitySelectors(entityKey).selectAllRecords(state),
        args: ["yourEntityKey"], // Replace "yourEntityKey" with a test entity key
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Entity Selectors",
        name: "selectEntityDisplayName",
        selectorFn: (state, entityKey) => createEntitySelectors(entityKey).selectEntityDisplayName(state),
        args: ["yourEntityKey"],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Entity Selectors",
        name: "selectRecordByPrimaryKey",
        selectorFn: (state, entityKey, primaryKeyValues) =>
            createEntitySelectors(entityKey).selectRecordByPrimaryKey(state, primaryKeyValues),
        args: ["yourEntityKey", {primaryKey: "value"}], // Adjust primaryKey as needed
        isObjectArgs: true,
        conductTest: true
    },
    {
        category: "Entity Selectors",
        name: "selectRecordsByPrimaryKeys",
        selectorFn: (state, entityKey, primaryKeyValuesList) =>
            createEntitySelectors(entityKey).selectRecordsByPrimaryKeys(state, primaryKeyValuesList),
        args: ["yourEntityKey", [{primaryKey: "value1"}, {primaryKey: "value2"}]],
        isObjectArgs: true,
        conductTest: true
    },
]


export const selectorsConfig = [
    // selectAnyFieldMapping
    {
        category: "Local Testing",
        name: "selectAnyFieldMapping",
        selectorFn: schemaSelectors.selectAnyFieldMapping, // This works
        args: [entityKey],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Local Testing",
        name: "selectFieldNameMappingForEntity",
        selectorFn: schemaSelectors.selectFieldNameMappingForEntity, // This works
        args: [entityKey],
        isObjectArgs: false,
        conductTest: true
    },
    // {
    //     category: "Entity Selectors",
    //     name: "selectAllRecords",
    //     selectorFn: (state, entityKey) => createEntitySelectors(entityKey).selectAllRecords(state),
    //     args: ["yourEntityKey"], // Replace "yourEntityKey" with a test entity key
    //     isObjectArgs: false,
    //     conductTest: true
    // },
    // {
    //     category: "Entity Selectors",
    //     name: "selectEntityDisplayName",
    //     selectorFn: (state, entityKey) => createEntitySelectors(entityKey).selectEntityDisplayName(state),
    //     args: ["yourEntityKey"],
    //     isObjectArgs: false,
    //     conductTest: true
    // },
    // {
    //     category: "Entity Selectors",
    //     name: "selectRecordByPrimaryKey",
    //     selectorFn: (state, entityKey, primaryKeyValues) =>
    //         createEntitySelectors(entityKey).selectRecordByPrimaryKey(state, primaryKeyValues),
    //     args: ["yourEntityKey", { primaryKey: "value" }], // Adjust primaryKey as needed
    //     isObjectArgs: true,
    //     conductTest: true
    // },
    // {
    //     category: "Entity Selectors",
    //     name: "selectRecordsByPrimaryKeys",
    //     selectorFn: (state, entityKey, primaryKeyValuesList) =>
    //         createEntitySelectors(entityKey).selectRecordsByPrimaryKeys(state, primaryKeyValuesList),
    //     args: ["yourEntityKey", [{ primaryKey: "value1" }, { primaryKey: "value2" }]],
    //     isObjectArgs: true,
    //     conductTest: true
    // },



    // ----------------
    // Direct State Access Selectors
    // ----------------
    {
        category: "Direct State Access",
        name: "selectSchema",
        selectorFn: schemaSelectors.selectSchema,
        args: [],
        isObjectArgs: false,
        conductTest: false
    },
    {
        category: "Direct State Access",
        name: "selectEntityNames",
        selectorFn: schemaSelectors.selectEntityNames,
        args: [],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Direct State Access",
        name: "selectEntities",
        selectorFn: schemaSelectors.selectEntities,
        args: [],
        isObjectArgs: false,
        conductTest: false
    },
    {
        category: "Direct State Access",
        name: "selectFields",
        selectorFn: schemaSelectors.selectFields,
        args: [],
        isObjectArgs: false,
        conductTest: false
    },
    {
        category: "Direct State Access",
        name: "selectFieldsByEntity",
        selectorFn: schemaSelectors.selectFieldsByEntity,
        args: [],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Direct State Access",
        name: "selectIsInitialized",
        selectorFn: schemaSelectors.selectIsInitialized,
        args: [],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Direct State Access",
        name: "selectEntityDatabaseName",
        selectorFn: schemaSelectors.selectEntityDatabaseName,
        args: [entityKey],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Direct State Access",
        name: "selectEntityNameToDatabase",
        selectorFn: schemaSelectors.selectEntityNameToDatabase,
        args: [],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Direct State Access",
        name: "selectFieldNameToDatabase",
        selectorFn: schemaSelectors.selectFieldNameToDatabase,
        args: [],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Direct State Access",
        name: "selectEntityFieldNameToDatabaseMap",
        selectorFn: schemaSelectors.selectEntityFieldNameToDatabaseMap,
        args: [entityKey],
        isObjectArgs: false,
        conductTest: true
    },

    // ----------------
    // Direct Conversion Map Selectors
    // ----------------
    {
        category: "Conversion Maps",
        name: "selectEntityNameToCanonical",
        selectorFn: schemaSelectors.selectEntityNameToCanonical,
        args: [],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Conversion Maps",
        name: "selectFieldNameToCanonical",
        selectorFn: schemaSelectors.selectFieldNameToCanonical,
        args: [],
        isObjectArgs: false,
        conductTest: false
    },
    {
        category: "Conversion Maps",
        name: "selectEntityNameFormats",
        selectorFn: schemaSelectors.selectEntityNameFormats,
        args: [],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Conversion Maps",
        name: "selectFieldNameFormats",
        selectorFn: schemaSelectors.selectFieldNameFormats,
        args: [],
        isObjectArgs: false,
        conductTest: false
    },
    {
        category: "Conversion Maps",
        name: "selectEntityNameToBackend",
        selectorFn: schemaSelectors.selectEntityNameToBackend,
        args: [],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Conversion Maps",
        name: "selectFieldNameToBackend",
        selectorFn: schemaSelectors.selectFieldNameToBackend,
        args: [],
        isObjectArgs: false,
        conductTest: true
    },

    // ----------------
    // Core Derived Selectors
    // ----------------
    {
        category: "Core Derived Selectors",
        name: "selectEntity",
        selectorFn: schemaSelectors.selectEntity,
        args: [entityKey],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Core Derived Selectors",
        name: "selectEntityFields",
        selectorFn: schemaSelectors.selectEntityFields,
        args: [entityKey],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Core Derived Selectors",
        name: "selectField",
        selectorFn: schemaSelectors.selectField,
        args: [{entityName: entityKey, fieldName: fieldKey}],
        isObjectArgs: true,
        conductTest: true
    },
    {
        category: "Core Derived Selectors",
        name: "selectEntityPrimaryKeyField",
        selectorFn: schemaSelectors.selectEntityPrimaryKeyField,
        args: [entityKey],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Core Derived Selectors",
        name: "selectEntityDisplayField",
        selectorFn: schemaSelectors.selectEntityDisplayField,
        args: [entityKey],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Core Derived Selectors",
        name: "selectEntityRelationships",
        selectorFn: schemaSelectors.selectEntityRelationships,
        args: [entityKey],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Core Derived Selectors",
        name: "selectRelatedEntities",
        selectorFn: schemaSelectors.selectRelatedEntities,
        args: [entityKey],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Core Derived Selectors",
        name: "selectEntityFieldNameToDatabaseMap",
        selectorFn: schemaSelectors.selectEntityFieldNameToDatabaseMap,
        args: [entityKey],
        isObjectArgs: false,
        conductTest: true
    },

    // ----------------
    // Entity Name Conversion Selectors
    // ----------------
    {
        category: "Entity Name Conversion",
        name: "selectEntityBackendName",
        selectorFn: schemaSelectors.selectEntityBackendName,
        args: [entityKey],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Entity Name Conversion",
        name: "selectEntityFrontendName",
        selectorFn: schemaSelectors.selectEntityFrontendName,
        args: [entityKey],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Entity Name Conversion",
        name: "selectEntityPrettyName",
        selectorFn: schemaSelectors.selectEntityPrettyName,
        args: [entityKey],
        isObjectArgs: false,
        conductTest: true
    },
    {
        category: "Entity Name Conversion",
        name: "selectEntityAnyName",
        selectorFn: schemaSelectors.selectEntityAnyName,
        args: [{entityName: entityKey, format: formatThree}],
        isObjectArgs: true,
        conductTest: true
    },
    {
        category: "Entity Name Conversion",
        name: "selectEntityCanonicalName",
        selectorFn: schemaSelectors.selectEntityCanonicalName,
        args: [entityKey],
        isObjectArgs: false, conductTest: true
    },

    // ----------------
    // Field Name Conversion Selectors
    // ----------------
    {
        category: "Field Name Conversion",
        name: "selectFieldDatabaseName",
        selectorFn: schemaSelectors.selectFieldDatabaseName,
        args: [{entityName: entityKey, fieldName: fieldKey}],
        isObjectArgs: true, conductTest: true
    },
    {
        category: "Field Name Conversion",
        name: "selectFieldBackendName",
        selectorFn: schemaSelectors.selectFieldBackendName,
        args: [{entityName: entityKey, fieldName: fieldKey}],
        isObjectArgs: true, conductTest: true
    },
    {
        category: "Field Name Conversion",
        name: "selectFieldFrontendName",
        selectorFn: schemaSelectors.selectFieldFrontendName,
        args: [{entityName: entityKey, fieldName: fieldKey}],
        isObjectArgs: true, conductTest: true
    },
    {
        category: "Field Name Conversion",
        name: "selectFieldPrettyName",
        selectorFn: schemaSelectors.selectFieldPrettyName,
        args: [{entityName: entityKey, fieldName: fieldKey}],
        isObjectArgs: true, conductTest: true
    },
    {
        category: "Field Name Conversion",
        name: "selectFieldAnyName",
        selectorFn: schemaSelectors.selectFieldAnyName,
        args: [{entityName: entityKey, fieldName: fieldKey, format: formatThree}], //
        isObjectArgs: true, conductTest: true
    },
    // ----------------
    // New Selectors
    // ---------------
    {
        category: "Field Name Conversion",
        name: "selectAllFieldPrettyNames",
        selectorFn: schemaSelectors.selectAllFieldPrettyNames,
        args: [{entityName: entityKey}],
        isObjectArgs: true, conductTest: true
    },


    // ----------------
    // Schema Selectors
    // ----------------
    {
        category: "Schema Selectors",
        name: "selectEntitySchema",
        selectorFn: schemaSelectors.selectEntitySchema,
        args: [{entityName: entityKey}],
        isObjectArgs: true, conductTest: true
    },
    {
        category: "Schema Selectors",
        name: "selectFieldSchema",
        selectorFn: schemaSelectors.selectFieldSchema,
        args: [{entityName: entityKey, fieldName: fieldKey}],
        isObjectArgs: true, conductTest: true
    },

    // ----------------
    // Conversion Selectors
    // ----------------
    {
        category: "Conversion",
        name: "selectDatabaseConversion",
        selectorFn: schemaSelectors.selectDatabaseConversion,
        args: [{entityName: entityKey, data: sampleData}],
        isObjectArgs: true, conductTest: true
    },
    {
        category: "Conversion",
        name: "selectBackendConversion",
        selectorFn: schemaSelectors.selectBackendConversion,
        args: [{entityName: entityKey, data: sampleData}],
        isObjectArgs: true, conductTest: true
    },
    {
        category: "Conversion",
        name: "selectPrettyConversion",
        selectorFn: schemaSelectors.selectPrettyConversion,
        args: [{entityName: entityKey, data: sampleData}],
        isObjectArgs: true, conductTest: true
    },
    {
        category: "Conversion",
        name: "selectAnyObjectFormatConversion",
        selectorFn: schemaSelectors.selectAnyObjectFormatConversion,
        args: [{entityName: entityKey, data: sampleData, format: formatOne}],
        isObjectArgs: true, conductTest: true
    },
    {
        category: "Conversion",
        name: "selectUnknownToAnyObjectFormatConversion",
        selectorFn: schemaSelectors.selectUnknownToAnyObjectFormatConversion,
        args: [{entityAlias: entityKey, data: sampleData, targetFormat: formatThree}],
        isObjectArgs: true, conductTest: true
    },
    {
        category: "Conversion",
        name: "selectFrontendConversion",
        selectorFn: schemaSelectors.selectFrontendConversion,
        args: [{entityName: entityKey, data: sampleDataTwo}],
        isObjectArgs: true, conductTest: true
    },
    {
        category: "Conversion",
        name: "selectCanonicalConversion",
        selectorFn: schemaSelectors.selectCanonicalConversion,
        args: [{entityName: entityKey, data: sampleDataTwo}],
        isObjectArgs: true, conductTest: true
    },
    {
        category: "Conversion",
        name: "selectQueryDatabaseConversion",
        selectorFn: schemaSelectors.selectQueryDatabaseConversion,
        args: [{entityName: entityKey, options: queryOptions}],
        isObjectArgs: true, conductTest: true
    },
    {
        category: "Conversion",
        name: "selectPayloadOptionsDatabaseConversion",
        selectorFn: schemaSelectors.selectPayloadOptionsDatabaseConversion,
        args: [{entityName: entityKey, options: queryOptions}],
        isObjectArgs: true, conductTest: true
    },
    {
        category: "Conversion",
        name: "selectReplaceKeysInObject",
        selectorFn: schemaSelectors.selectReplaceKeysInObject,
        args: [dataObject, sampleKeyMapping],
        isObjectArgs: false, conductTest: true
    },
    {
        category: "Conversion",
        name: "safeSelectReplaceKeysInObjectWithErrorControl",
        selectorFn: schemaSelectors.safeSelectReplaceKeysInObjectWithErrorControl,
        args: [dataObject, sampleKeyMapping],
        isObjectArgs: false, conductTest: true
    },
    {
        category: "Conversion",
        name: "selectUnifiedQueryDatabaseConversion",
        selectorFn: schemaSelectors.selectUnifiedQueryDatabaseConversion,
        args: [{entityName: entityKey, options: unifiedQuery}],
        isObjectArgs: true, conductTest: true
    },

    // ----------------
    // Additional Selectors
    // ----------------
];
