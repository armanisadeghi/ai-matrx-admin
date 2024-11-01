// app/(authenticated)/tests/matrx-table/hold-hold-page.tsx

'use client';

import React from 'react';
import * as schemaSelectors from "@/lib/redux/schema/globalCacheSelectors";
import { useAppSelector } from '@/lib/redux/hooks';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {JsonViewer} from "@/components/ui";
import {EntityKeys} from "@/types/entityTypes";

const entityKey = 'registeredFunction'; // Replace with a valid entity key
const fieldKey = 'modulePath'; // Replace with a valid field key
const fieldKey2 = 'className'; // Replace with a valid field key
const wrongFieldKey = 'not-valid_but-should_see'; // Replace with a valid field key
const modulePathValue = "sampleModulePath"; // Replace with a valid module path
const classNameValue = "sampleClassName"; // Replace with a valid class name

const sampleData = [{[fieldKey]: "value1"}, {[fieldKey2]: "value2"} ]; // Sample data structure

const sampleDataTwo = [{[fieldKey]: "value1"}, {[fieldKey2]: "value2"}, {['p_module_path']: "value1"}, {["class_name"]: "value2"},{['module-path']: "value1"}, {["p_class_name"]: "value2"} ]; // Sample data structure
const sampleDataThree = [{[fieldKey]: "value1"}, {[fieldKey2]: "value2"}, {['p_module_path']: "value1"}, {["class_name"]: "value2"},{['module-path']: "value1"}, {["p_class_name"]: "value2"} ]; // Sample data structure

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

const queryOptions = {
    tableName: entityKey,
    filters: {[fieldKey]: "some random filter value"},
    sorts: [{column: fieldKey2, ascending: true}, {column: fieldKey, ascending: true}],
    columns: ["returnBroker", "should-remain-kabob", wrongFieldKey],
    limit: 10,
    offset: 0,
};

const formatOne = "kebab";
const formatTwo = "component";
const formatThree = "pretty";
const formatFour = "GraphQL";

const DataDisplay = ({ data }) => {
    const isString = typeof data === 'string';

    if (isString) {
        return (
            <pre className="text-xs overflow-auto max-h-40">
        {data}
      </pre>
        );
    }

    return <JsonViewer data={data} />;
};


const SelectorTestPage: React.FC = () => {

    // Direct State Access Selectors
    const schema = useAppSelector(schemaSelectors.selectSchema);
    const entityNames = useAppSelector(schemaSelectors.selectEntityNames);
    const entities = useAppSelector(schemaSelectors.selectEntities);
    const fields = useAppSelector(schemaSelectors.selectFields);
    const fieldsByEntity = useAppSelector(schemaSelectors.selectFieldsByEntity);
    const isInitialized = useAppSelector(schemaSelectors.selectIsInitialized);

    // Direct Conversion Map Selectors
    const entityNameToCanonical = useAppSelector(schemaSelectors.selectEntityNameToCanonical);
    const fieldNameToCanonical = useAppSelector(schemaSelectors.selectFieldNameToCanonical);
    const entityNameFormats = useAppSelector(schemaSelectors.selectEntityNameFormats);
    const fieldNameFormats = useAppSelector(schemaSelectors.selectFieldNameFormats);
    const entityNameToDatabase = useAppSelector(schemaSelectors.selectEntityNameToDatabase);
    const entityNameToBackend = useAppSelector(schemaSelectors.selectEntityNameToBackend);
    const fieldNameToDatabase = useAppSelector(schemaSelectors.selectFieldNameToDatabase);
    const fieldNameToBackend = useAppSelector(schemaSelectors.selectFieldNameToBackend);

    // Core Derived Selectors
    const entity = useAppSelector((state) => schemaSelectors.selectEntity(state, entityKey));
    const entityFields = useAppSelector((state) => schemaSelectors.selectEntityFields(state, entityKey));
    const field = useAppSelector((state) => schemaSelectors.selectField(state, {
        entityName: entityKey,
        fieldName: fieldKey
    }));
    const entityPrimaryKeyField = useAppSelector((state) => schemaSelectors.selectEntityPrimaryKeyField(state, entityKey));
    const entityDisplayField = useAppSelector((state) => schemaSelectors.selectEntityDisplayField(state, entityKey));
    const entityRelationships = useAppSelector((state) => schemaSelectors.selectEntityRelationships(state, entityKey));
    const relatedEntities = useAppSelector((state) => schemaSelectors.selectRelatedEntities(state, entityKey));

    // Entity Name Conversion Selectors
    const entityDatabaseName = useAppSelector((state) => schemaSelectors.selectEntityDatabaseName(state, entityKey));
    const entityBackendName = useAppSelector((state) => schemaSelectors.selectEntityBackendName(state, entityKey));
    const entityFrontendName = useAppSelector((state) => schemaSelectors.selectEntityFrontendName(state, entityKey));
    const entityPrettyName = useAppSelector((state) => schemaSelectors.selectEntityPrettyName(state, entityKey));
    const entityAnyName = useAppSelector((state) => schemaSelectors.selectEntityAnyName(state, {
        entityName: entityKey,
        format: formatThree
    }));

    // Field Name Conversion Selectors
    const fieldDatabaseName = useAppSelector((state) => schemaSelectors.selectFieldDatabaseName(state, {
        entityName: entityKey,
        fieldName: fieldKey
    }));
    const fieldBackendName = useAppSelector((state) => schemaSelectors.selectFieldBackendName(state, {
        entityName: entityKey,
        fieldName: fieldKey
    }));
    const fieldFrontendName = useAppSelector((state) => schemaSelectors.selectFieldFrontendName(state, {
        entityName: entityKey,
        fieldName: fieldKey
    }));
    const fieldPrettyName = useAppSelector((state) => schemaSelectors.selectFieldPrettyName(state, {
        entityName: entityKey,
        fieldName: fieldKey
    }));
    const fieldAnyName = useAppSelector((state) => schemaSelectors.selectFieldAnyName(state, {
        entityName: entityKey,
        fieldName: fieldKey,
        format: formatThree
    }));

    // Schema Selectors
    const entitySchema = useAppSelector((state) => schemaSelectors.selectEntitySchema(state, {
        entityName: entityKey
    }));

    const fieldSchema = useAppSelector((state) => schemaSelectors.selectFieldSchema(state, {
        entityName: entityKey,
        fieldName: fieldKey
    }));

    // Conversion Selectors

    const databaseConversion = useAppSelector((state) => schemaSelectors.selectDatabaseConversion(state, {
        entityName: entityKey,
        data: sampleData
    }));

    const backendConversion = useAppSelector((state) => schemaSelectors.selectBackendConversion(state, {
        entityName: entityKey,
        data: sampleData
    }));

    const prettyConversion = useAppSelector((state) => schemaSelectors.selectPrettyConversion(state, {
        entityName: entityKey,
        data: sampleData
    }));

    const formatConversion = useAppSelector((state) => schemaSelectors.selectFormatConversion(state, {
        entityName: entityKey,
        data: sampleData,
        format: formatOne
    }));
    const unknownFormatConversion = useAppSelector((state) => schemaSelectors.selectUnknownFormatConversion(state, {
        entityNameOrAlias: entityKey,
        data: sampleData,
        targetFormat: formatThree
    }));
    const unknownFieldFormatConversion = useAppSelector((state) => schemaSelectors.selectUnknownFieldFormatConversion(state, {
        entityNameOrAlias: entityKey,
        fieldNameOrAlias: fieldKey,
        targetFormat: formatTwo
    }));
    const frontendConversion = useAppSelector((state) => schemaSelectors.selectFrontendConversion(state, {
        entityName: entityKey,
        data: sampleDataTwo
    }));
    const canonicalConversion = useAppSelector((state) => schemaSelectors.selectCanonicalConversion(state, {
        entityName: entityKey,
        data: sampleDataTwo
    }));



    const queryDatabaseConversion = useAppSelector((state) =>
        schemaSelectors.selectQueryDatabaseConversion(state, {
            entityName: entityKey,
            options: queryOptions
        })
    );
    const payloadOptionsDatabaseConversion = useAppSelector((state) =>
        schemaSelectors.selectPayloadOptionsDatabaseConversion(state, {
            entityName: entityKey,
            options: queryOptions
        })
    );
    // good
    const fieldDatabaseColumns = useAppSelector((state) =>
        schemaSelectors.selectFieldDatabaseColumns(state, {
            entityName: entityKey,
            columns: [fieldKey, fieldKey2, wrongFieldKey]
        })
    );

    const selectorData = [
        // Direct State Access Selectors
/*
          { category: "Direct State Access", name: "selectSchema", props: "None", result: schema },
          { category: "Direct State Access", name: "selectEntityNames", props: "None", result: entityNames },
          { category: "Direct State Access", name: "selectEntities", props: "None", result: entities },
          { category: "Direct State Access", name: "selectFields", props: "None", result: fields },
          { category: "Direct State Access", name: "selectFieldsByEntity", props: "None", result: fieldsByEntity },
          { category: "Direct State Access", name: "selectIsInitialized", props: "None", result: isInitialized },

          // Direct Conversion Map Selectors
          { category: "Conversion Maps", name: "selectEntityNameToCanonical", props: "None", result: entityNameToCanonical },
          { category: "Conversion Maps", name: "selectFieldNameToCanonical", props: "None", result: fieldNameToCanonical },
          { category: "Conversion Maps", name: "selectEntityNameFormats", props: "None", result: entityNameFormats },
          { category: "Conversion Maps", name: "selectFieldNameFormats", props: "None", result: fieldNameFormats },
          { category: "Conversion Maps", name: "selectEntityNameToDatabase", props: "None", result: entityNameToDatabase },
          { category: "Conversion Maps", name: "selectEntityNameToBackend", props: "None", result: entityNameToBackend },
          { category: "Conversion Maps", name: "selectFieldNameToDatabase", props: "None", result: fieldNameToDatabase },
          { category: "Conversion Maps", name: "selectFieldNameToBackend", props: "None", result: fieldNameToBackend },
*/

        { category: "Conversion Maps", name: "selectFieldNameToDatabase", props: "None", result: fieldNameToDatabase },

        { category: "Conversion Maps", name: "selectEntityNameToDatabase", props: "None", result: entityNameToDatabase },


        // Core Derived Selectors
        // { category: "Core Derived Selectors", name: "selectEntity", props: JSON.stringify({ entityName: entityKey }, null, 2), result: JSON.stringify(entity, null, 2) },
        // { category: "Core Derived Selectors", name: "selectEntityFields", props: JSON.stringify({ entityName: entityKey }, null, 2), result: JSON.stringify(entityFields, null, 2) },
        { category: "Core Derived Selectors", name: "selectField", props: JSON.stringify({ entityName: entityKey, fieldName: fieldKey }, null, 2), result:field },
        // { category: "Core Derived Selectors", name: "selectEntityPrimaryKeyField", props: JSON.stringify({ entityName: entityKey }, null, 2), result: entityPrimaryKeyField },
        // { category: "Core Derived Selectors", name: "selectEntityDisplayField", props: JSON.stringify({ entityName: entityKey }, null, 2), result: entityDisplayField },
        // { category: "Core Derived Selectors", name: "selectEntityRelationships", props: JSON.stringify({ entityName: entityKey }, null, 2), result: entityRelationships },
        // { category: "Core Derived Selectors", name: "selectRelatedEntities", props: JSON.stringify({ entityName: entityKey }, null, 2), result: relatedEntities },

        // Entity Name Conversion Selectors
        // { category: "Entity Name Conversion", name: "selectEntityDatabaseName", props: JSON.stringify({ entityName: entityKey }, null, 2), result: JSON.stringify(entityDatabaseName, null, 2) },
        // { category: "Entity Name Conversion", name: "selectEntityBackendName", props: JSON.stringify({ entityName: entityKey }, null, 2), result: JSON.stringify(entityBackendName, null, 2) },
        // { category: "Entity Name Conversion", name: "selectEntityFrontendName", props: JSON.stringify({ entityName: entityKey }, null, 2), result: JSON.stringify(entityFrontendName, null, 2) },
        // { category: "Entity Name Conversion", name: "selectEntityPrettyName", props: JSON.stringify({ entityName: entityKey }, null, 2), result: JSON.stringify(entityPrettyName, null, 2) },
        // { category: "Entity Name Conversion", name: "selectEntityAnyName", props: JSON.stringify({ entityName: entityKey, format: formatTwo }, null, 2), result: JSON.stringify(entityAnyName, null, 2) },

        // Field Name Conversion Selectors
        // { category: "Field Name Conversion", name: "selectFieldDatabaseName", props: JSON.stringify({ entityName: entityKey, fieldName: fieldKey }, null, 2), result: JSON.stringify(fieldDatabaseName, null, 2) },
        // { category: "Field Name Conversion", name: "selectFieldBackendName", props: JSON.stringify({ entityName: entityKey, fieldName: fieldKey }, null, 2), result: JSON.stringify(fieldBackendName, null, 2) },
        // { category: "Field Name Conversion", name: "selectFieldFrontendName", props: JSON.stringify({ entityName: entityKey, fieldName: fieldKey }, null, 2), result: JSON.stringify(fieldFrontendName, null, 2) },
        // { category: "Field Name Conversion", name: "selectFieldPrettyName", props: JSON.stringify({ entityName: entityKey, fieldName: fieldKey }, null, 2), result: JSON.stringify(fieldPrettyName, null, 2) },
        // { category: "Field Name Conversion", name: "selectFieldAnyName", props: JSON.stringify({ entityName: entityKey, fieldName: fieldKey, format: formatThree }, null, 2), result: JSON.stringify(fieldAnyName, null, 2) },

        // Schema Selectors
/*
        { category: "Schema Selectors", name: "selectEntitySchema", props: JSON.stringify({ entityName: entityKey }, null, 2), result: JSON.stringify(entitySchema, null, 2) },
        { category: "Schema Selectors", name: "selectFieldSchema", props: JSON.stringify({ entityName: entityKey, fieldName: fieldKey }, null, 2), result: JSON.stringify(fieldSchema, null, 2) },
*/

        // Conversion Selectors
        { category: "Conversion", name: "selectDatabaseConversion", props: JSON.stringify({ entityName: entityKey, data: sampleData }, null, 2), result: JSON.stringify(databaseConversion, null, 2) },
        { category: "Conversion", name: "selectBackendConversion", props: JSON.stringify({ entityName: entityKey, data: sampleData }, null, 2), result: JSON.stringify(backendConversion, null, 2) },
        { category: "Conversion", name: "selectPrettyConversion", props: JSON.stringify({ entityName: entityKey, data: sampleData }, null, 2), result: JSON.stringify(prettyConversion, null, 2) },
        { category: "Conversion", name: "selectFormatConversion", props: JSON.stringify({ entityName: entityKey, data: sampleData, format: formatOne }, null, 2), result: JSON.stringify(formatConversion, null, 2) },
        { category: "Conversion", name: "selectUnknownFormatConversion", props: JSON.stringify({ entityNameOrAlias: entityKey, data: sampleData, targetFormat: formatThree }, null, 2), result: JSON.stringify(unknownFormatConversion, null, 2) },
        { category: "Conversion", name: "selectUnknownFieldFormatConversion", props: JSON.stringify({ entityNameOrAlias: entityKey, fieldNameOrAlias: fieldKey, targetFormat: formatTwo }, null, 2), result: JSON.stringify(unknownFieldFormatConversion, null, 2) },
        { category: "Conversion", name: "selectFrontendConversion", props: JSON.stringify({ entityName: entityKey, data: sampleDataTwo }, null, 2), result: JSON.stringify(frontendConversion, null, 2) },
        { category: "Conversion", name: "selectCanonicalConversion", props: JSON.stringify({ entityName: entityKey, data: sampleDataTwo }, null, 2), result: JSON.stringify(canonicalConversion, null, 2) },

        // Query Conversion Selectors
        {
            category: "Query Conversion",
            name: "selectQueryDatabaseConversion",
            props: JSON.stringify({ entityName: entityKey, options: queryOptions }, null, 2),
            result: JSON.stringify(queryDatabaseConversion, null, 2)
        },
        {
            category: "Query Conversion",
            name: "selectPayloadOptionsDatabaseConversion",
            props: JSON.stringify({ entityName: entityKey, options: queryOptions }, null, 2),
            result: JSON.stringify(payloadOptionsDatabaseConversion, null, 2)
        },
        {
            category: "Query Conversion",
            name: "selectFieldDatabaseColumns",
            props: JSON.stringify({ entityName: entityKey, columns: [fieldKey, fieldKey2, wrongFieldKey] }, null, 2),
            result: JSON.stringify(fieldDatabaseColumns, null, 2)
        }
    ];

    return (
        <div className="p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Selector Test Results</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-48">Category</TableHead>
                                <TableHead className="w-64">Selector Name</TableHead>
                                <TableHead className="w-96">Props</TableHead>
                                <TableHead>Result</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectorData.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{item.category}</TableCell>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell>
                                        <pre className="text-xs overflow-auto max-h-40">{item.props}</pre>
                                    </TableCell>
                                    <TableCell>
                                        <DataDisplay data={item.result} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default SelectorTestPage;
