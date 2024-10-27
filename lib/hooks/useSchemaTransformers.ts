import {
    AnyFieldNameVariant, BackendTableType, ComponentTableType, CustomTableType, DatabaseTableType,
    FieldFormatVariation,
    FieldNameFormats, FrontendTableType,
    GenerateTableType, GraphQLTableType, KebabTableType, NameFormatType, PrettyTableType, RestAPITableType,
    SingleStructureFields, SqlFunctionRefTableType,
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
        format: NameFormatType
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
        NameFormatType extends keyof FieldNameFormats<TTable, TField>
    >(
        tableName: TableNameVariant,
        object: DatabaseRecord,
        format: NameFormatType
    ): NameFormatType extends 'frontend' ? FrontendTableType<TTable> :
       NameFormatType extends 'backend' ? BackendTableType<TTable> :
       NameFormatType extends 'database' ? DatabaseTableType<TTable> :
       NameFormatType extends 'pretty' ? PrettyTableType<TTable> :
       NameFormatType extends 'component' ? ComponentTableType<TTable> :
       NameFormatType extends 'kebab' ? KebabTableType<TTable> :
       NameFormatType extends 'sqlFunctionRef' ? SqlFunctionRefTableType<TTable> :
       NameFormatType extends 'RestAPI' ? RestAPITableType<TTable> :
       NameFormatType extends 'GraphQL' ? GraphQLTableType<TTable> :
       NameFormatType extends 'custom' ? CustomTableType<TTable> :
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
        ): FrontendTableType<TTable> =>
            transformObject<TTable, SingleStructureFields<TTable>, 'frontend'>(
                tableName,
                object,
                'frontend'
            ),

        toBackend: <TTable extends TableKeys>(
            tableName: TableNameVariant,
            object: Partial<GenerateTableType<TTable>>
        ): BackendTableType<TTable> =>
            transformObject<TTable, SingleStructureFields<TTable>, 'backend'>(
                tableName,
                object,
                'backend'
            ),

        toDatabase: <TTable extends TableKeys>(
            tableName: TableNameVariant,
            object: DatabaseRecord
        ): DatabaseTableType<TTable> =>
            transformObject<TTable, SingleStructureFields<TTable>, 'database'>(
                tableName,
                object,
                'database'
            ),

        toPretty: <TTable extends TableKeys>(
            tableName: TableNameVariant,
            object: Partial<GenerateTableType<TTable>>
        ): PrettyTableType<TTable> =>
            transformObject<TTable, SingleStructureFields<TTable>, 'pretty'>(
                tableName,
                object,
                'pretty'
            ),

        toComponent: <TTable extends TableKeys>(
            tableName: TableNameVariant,
            object: Partial<GenerateTableType<TTable>>
        ): ComponentTableType<TTable> =>
            transformObject<TTable, SingleStructureFields<TTable>, 'component'>(
                tableName,
                object,
                'component'
            ),

        toKebab: <TTable extends TableKeys>(
            tableName: TableNameVariant,
            object: Partial<GenerateTableType<TTable>>
        ): KebabTableType<TTable> =>
            transformObject<TTable, SingleStructureFields<TTable>, 'kebab'>(
                tableName,
                object,
                'kebab'
            ),

        toSqlFunctionRef: <TTable extends TableKeys>(
            tableName: TableNameVariant,
            object: Partial<GenerateTableType<TTable>>
        ): SqlFunctionRefTableType<TTable> =>
            transformObject<TTable, SingleStructureFields<TTable>, 'sqlFunctionRef'>(
                tableName,
                object,
                'sqlFunctionRef'
            ),

        toRestAPI: <TTable extends TableKeys>(
            tableName: TableNameVariant,
            object: Partial<GenerateTableType<TTable>>
        ): RestAPITableType<TTable> =>
            transformObject<TTable, SingleStructureFields<TTable>, 'RestAPI'>(
                tableName,
                object,
                'RestAPI'
            ),

        toGraphQL: <TTable extends TableKeys>(
            tableName: TableNameVariant,
            object: Partial<GenerateTableType<TTable>>
        ): GraphQLTableType<TTable> =>
            transformObject<TTable, SingleStructureFields<TTable>, 'GraphQL'>(
                tableName,
                object,
                'GraphQL'
            ),

        toCustom: <TTable extends TableKeys>(
            tableName: TableNameVariant,
            object: Partial<GenerateTableType<TTable>>
        ): CustomTableType<TTable> =>
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
