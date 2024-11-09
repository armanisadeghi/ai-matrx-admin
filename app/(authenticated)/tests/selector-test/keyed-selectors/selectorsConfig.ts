// selectorsConfig.ts
import * as schemaSelectors from "@/lib/redux/schema/globalCacheSelectors";
import {EntityKeys} from "@/types/entityTypes";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import {EntitySelectorConfig} from "@/app/(authenticated)/tests/selector-test/keyed-selectors/page";


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


export const entitySelectorsConfig: EntitySelectorConfig[] = [
    {
        category: "Entity Metadata",
        entityKey: "emails",
        selectors: [
            {
                name: "selectEntityDisplayName",
                selectorKey: "selectEntityDisplayName",
                args: [],  // No args needed
                isObjectArgs: false,
                conductTest: true
            },
            {
                name: "selectMetadataSummary",
                selectorKey: "selectMetadataSummary",
                args: [],
                isObjectArgs: false,
                conductTest: true
            }, //
            {
                name: "selectPrimaryKeyMetadata",
                selectorKey: "selectPrimaryKeyMetadata",
                args: [],  // No args needed
                isObjectArgs: false,
                conductTest: true
            },
            {
                name: "selectRecordByPrimaryKey",
                selectorKey: "selectRecordByPrimaryKey",
                args: [{'id': "b0f1b14a-110e-4947-af3c-d3f95a70897f"}],
                isObjectArgs: false,
                conductTest: true
            },
            {
                name: "selectFieldInfo",
                selectorKey: "selectFieldInfo",
                args: [],
                isObjectArgs: false,
                conductTest: true
            },

        ] //fieldInfo
    },
    // {
    //     category: "Entity Metadata",
    //     entityKey: "flashcardSet",
    //     selectors: [
    //         {
    //             name: "selectEntityDisplayName",
    //             selectorKey: "selectEntityDisplayName",
    //             args: [],  // No args needed
    //             isObjectArgs: false,
    //             conductTest: true
    //         },
    //         {
    //             name: "selectMetadataSummary",
    //             selectorKey: "selectMetadataSummary",
    //             args: [],
    //             isObjectArgs: false,
    //             conductTest: true
    //         }, //
    //         {
    //             name: "selectPrimaryKeyMetadata",
    //             selectorKey: "selectPrimaryKeyMetadata",
    //             args: [],  // No args needed
    //             isObjectArgs: false,
    //             conductTest: true
    //         },
    //
    //     ]
    // },

    // {
    //     category: "Conversion",
    //     entityKey: "registeredFunction",
    //     selectors: [
    //         {
    //             name: "selectAnyObjectFormatConversion",
    //             selectorKey: "selectAnyObjectFormatConversion",
    //             args: [{
    //                 entityName: "customEvent",
    //                 data: { /* your sample data */ },
    //                 format: "formatOne"
    //             }],
    //             isObjectArgs: true,
    //             conductTest: true
    //         },
    //         {
    //             name: "selectUnknownToAnyObjectFormatConversion",
    //             selectorKey: "selectUnknownToAnyObjectFormatConversion",
    //             args: [{
    //                 entityAlias: "customEvent",
    //                 data: { /* your sample data */ },
    //                 targetFormat: "formatThree"
    //             }],
    //             isObjectArgs: true,
    //             conductTest: true
    //         }
    //     ]
    // }
];


