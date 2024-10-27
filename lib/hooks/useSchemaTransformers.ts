import {
    AnyFieldNameVariant,
    FieldFormatVariation,
    FieldNameFormats,
    GenerateBackendTableType,
    GenerateComponentTableType,
    GenerateCustomTableType,
    GenerateDatabaseTableType,
    GenerateFrontendTableType,
    GenerateGraphQLTableType,
    GenerateKebabTableType,
    GeneratePrettyTableType,
    GenerateRestAPITableType,
    GenerateSqlFunctionRefTableType,
    GenerateTableType,
    SingleStructureFields,
    TableFields,
    TableKeys,
    TableNameVariant
} from "@/types/automationTableTypes";
import { useSchemaResolution } from "@/providers/SchemaProvider";

// Type guard to ensure we're working with valid database records
type DatabaseRecord = Record<string, unknown>;
type ValidDatabaseRecord<T> = T extends DatabaseRecord ? T : never;

export function useSchemaTransform() {
    const nameResolution = useSchemaResolution();
    const { getTableSchema, resolveTableKey, resolveFieldKey, getFieldNameInFormat } = nameResolution;

    const transformObjectBasic = <
        TTable extends TableKeys,
        TField extends TableFields<TTable>
    >(
        tableName: TableNameVariant,
        object: Record<AnyFieldNameVariant, any>,
        format: FieldFormatVariation<TTable, TField>
    ) => {
        const tableKey = resolveTableKey(tableName) as TTable;

        return Object.entries(object).reduce<Record<string, any>>((acc, [fieldName, value]) => {
            const fieldKey = resolveFieldKey(tableKey, fieldName as AnyFieldNameVariant) as TField;
            const newKey = getFieldNameInFormat(tableKey, fieldKey, format);
            acc[newKey as string] = value;
            return acc;
        }, {});
    };

    const transformObject = <
        TTable extends TableKeys,
        TField extends SingleStructureFields<TTable>,
        TFormat extends keyof FieldNameFormats<TTable, TField>
    >(
        tableName: TableNameVariant,
        object: DatabaseRecord,
        format: TFormat
    ): TFormat extends 'frontend' ? GenerateFrontendTableType<TTable> :
       TFormat extends 'backend' ? GenerateBackendTableType<TTable> :
       TFormat extends 'database' ? GenerateDatabaseTableType<TTable> :
       TFormat extends 'pretty' ? GeneratePrettyTableType<TTable> :
       TFormat extends 'component' ? GenerateComponentTableType<TTable> :
       TFormat extends 'kebab' ? GenerateKebabTableType<TTable> :
       TFormat extends 'sqlFunctionRef' ? GenerateSqlFunctionRefTableType<TTable> :
       TFormat extends 'RestAPI' ? GenerateRestAPITableType<TTable> :
       TFormat extends 'GraphQL' ? GenerateGraphQLTableType<TTable> :
       TFormat extends 'custom' ? GenerateCustomTableType<TTable> :
       never => {
        const tableKey = resolveTableKey(tableName) as TTable;

        const result = Object.entries(object).reduce<Record<string, unknown>>((acc, [fieldName, value]) => {
            const fieldKey = resolveFieldKey(tableKey, fieldName as AnyFieldNameVariant) as TField;
            const newKey = getFieldNameInFormat(tableKey, fieldKey, format);
            acc[newKey as string] = value;
            return acc;
        }, {});

        return result as any;
    };

    const formatTransformers = {
        toFrontend: <TTable extends TableKeys>(
            tableName: TableNameVariant,
            object: Partial<GenerateTableType<TTable>>
        ): GenerateFrontendTableType<TTable> =>
            transformObject<TTable, SingleStructureFields<TTable>, 'frontend'>(
                tableName,
                object,
                'frontend'
            ),

        toBackend: <TTable extends TableKeys>(
            tableName: TableNameVariant,
            object: Partial<GenerateTableType<TTable>>
        ): GenerateBackendTableType<TTable> =>
            transformObject<TTable, SingleStructureFields<TTable>, 'backend'>(
                tableName,
                object,
                'backend'
            ),

        toDatabase: <TTable extends TableKeys>(
            tableName: TableNameVariant,
            object: DatabaseRecord
        ): GenerateDatabaseTableType<TTable> =>
            transformObject<TTable, SingleStructureFields<TTable>, 'database'>(
                tableName,
                object,
                'database'
            ),

        toPretty: <TTable extends TableKeys>(
            tableName: TableNameVariant,
            object: Partial<GenerateTableType<TTable>>
        ): GeneratePrettyTableType<TTable> =>
            transformObject<TTable, SingleStructureFields<TTable>, 'pretty'>(
                tableName,
                object,
                'pretty'
            ),

        toComponent: <TTable extends TableKeys>(
            tableName: TableNameVariant,
            object: Partial<GenerateTableType<TTable>>
        ): GenerateComponentTableType<TTable> =>
            transformObject<TTable, SingleStructureFields<TTable>, 'component'>(
                tableName,
                object,
                'component'
            ),

        toKebab: <TTable extends TableKeys>(
            tableName: TableNameVariant,
            object: Partial<GenerateTableType<TTable>>
        ): GenerateKebabTableType<TTable> =>
            transformObject<TTable, SingleStructureFields<TTable>, 'kebab'>(
                tableName,
                object,
                'kebab'
            ),

        toSqlFunctionRef: <TTable extends TableKeys>(
            tableName: TableNameVariant,
            object: Partial<GenerateTableType<TTable>>
        ): GenerateSqlFunctionRefTableType<TTable> =>
            transformObject<TTable, SingleStructureFields<TTable>, 'sqlFunctionRef'>(
                tableName,
                object,
                'sqlFunctionRef'
            ),

        toRestAPI: <TTable extends TableKeys>(
            tableName: TableNameVariant,
            object: Partial<GenerateTableType<TTable>>
        ): GenerateRestAPITableType<TTable> =>
            transformObject<TTable, SingleStructureFields<TTable>, 'RestAPI'>(
                tableName,
                object,
                'RestAPI'
            ),

        toGraphQL: <TTable extends TableKeys>(
            tableName: TableNameVariant,
            object: Partial<GenerateTableType<TTable>>
        ): GenerateGraphQLTableType<TTable> =>
            transformObject<TTable, SingleStructureFields<TTable>, 'GraphQL'>(
                tableName,
                object,
                'GraphQL'
            ),

        toCustom: <TTable extends TableKeys>(
            tableName: TableNameVariant,
            object: Partial<GenerateTableType<TTable>>
        ): GenerateCustomTableType<TTable> =>
            transformObject<TTable, SingleStructureFields<TTable>, 'custom'>(
                tableName,
                object,
                'custom'
            )
    } as const;

    return {
        transformObjectBasic,
        transformObject,
        formatTransformers
    } as const;
}
