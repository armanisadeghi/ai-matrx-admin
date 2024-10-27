// utils/supabase/api-wrapper.ts


import {PostgrestError, PostgrestFilterBuilder} from '@supabase/postgrest-js';
import {SupabaseClient} from "@supabase/supabase-js";
import {
    AutomationTableStructure,
    TableNameFrontend,
    TableNameDatabase,
    TableName,
    TableNameVariation,
    FieldKey,
    TableNameVariant,
    TableKeys,
    GenerateTableType,
    AutomationTable,
    GenerateDatabaseTableType,
    GenerateFrontendTableType,
    SingleStructureFields
} from '@/types/automationTableTypes';
import {useSchema} from "@/lib/hooks/useSchema";
import {useSchemaResolution} from "@/providers/SchemaProvider";
import {useSchemaTransform} from "@/lib/hooks/useSchemaTransformers";
import {supabase} from "@/utils/supabase/client";

const defaultTrace = [__filename.split('/').pop() || 'unknownFile']; // In a Node.js environment

const trace: string[] = ['anotherFile'];

type QueryBuilder = PostgrestFilterBuilder<any, any, any>;

export type ConvertToDatabase<TTable extends TableKeys> = {
    [K in keyof GenerateFrontendTableType<TTable>]: GenerateDatabaseTableType<TTable>[keyof GenerateDatabaseTableType<TTable>];
};

export type ConvertToFrontend<TTable extends TableKeys> = {
    [K in keyof GenerateDatabaseTableType<TTable>]: GenerateFrontendTableType<TTable>[keyof GenerateFrontendTableType<TTable>];
};

export type QueryOptions<TTable extends TableKeys> = {
    filters?: Partial<GenerateFrontendTableType<TTable>>;
    sorts?: Array<{
        column: keyof GenerateFrontendTableType<TTable>;
        ascending?: boolean;
    }>;
    limit?: number;
    offset?: number;
    columns?: Array<keyof GenerateFrontendTableType<TTable>>;
};

// Hook to initialize the wrapper with strictly typed schema information
export function useTableWrapper(requestTableName: TableNameVariant) {
    const {schema} = useSchema();
    const {
        resolveTableKey,
        resolveFieldKey,
        resolveTableAndFieldKeys,
        getTableNameInFormat,
        resolveTableNameInFormat,
        getFieldNameInFormat,
        resolveFieldNameInFormat,
        findPrimaryKeyFieldKey,
        findDisplayFieldKey,
        getFieldData,
        findFieldsByCondition,
        findFieldsWithDefaultGeneratorFunction,
        getFieldsWithAttribute,
    } = useSchemaResolution();  // Importing all for now, just to know what we have available.
    const {formatTransformers} = useSchemaTransform();

    const tableKey = resolveTableKey(requestTableName);
    const tableSchema = schema[tableKey];
    const primaryKeyField = findPrimaryKeyFieldKey(tableKey);
    const tableNameDbFormat = getTableNameInFormat(tableKey, 'database');

    if (!primaryKeyField) {
        throw new Error(`No primary key found for table ${requestTableName}`);
    }

    return {
        schema: tableSchema,
        tableNameDbFormat,
        primaryKeyField,
        formatTransformers
    } as const;
}

export class DatabaseApiWrapper<TTable extends TableKeys> {
    private readonly client: SupabaseClient;
    private readonly requestTableName: TableNameVariant;
    private readonly tableNameDbFormat: TableNameDatabase<TTable>;
    private readonly tableSchema: AutomationTable<TTable>;
    private readonly primaryKeyField: FieldKey<TTable>;
    private readonly formatTransformers: ReturnType<typeof useSchemaTransform>['formatTransformers'];
    private readonly subscriptions: Map<string, unknown> = new Map();
    private readonly queryBuilders: Map<string, unknown> = new Map();

    constructor(
        requestTableName: TableNameVariant,
        tableNameDbFormat: TableNameDatabase<TTable>,
        schema: AutomationTable<TTable>,
        primaryKeyField: FieldKey<TTable>,
        formatTransformers: ReturnType<typeof useSchemaTransform>['formatTransformers']
    ) {
        this.client = supabase;
        this.requestTableName = requestTableName;
        this.tableNameDbFormat = tableNameDbFormat;
        this.tableSchema = schema;
        this.primaryKeyField = primaryKeyField;
        this.formatTransformers = formatTransformers;
    }

    private buildBaseQuery(): QueryBuilder {
        return this.client.from(this.tableNameDbFormat).select('*');
    }

    private convertToDatabase(
        frontendData: Partial<GenerateFrontendTableType<TTable>>
    ): GenerateDatabaseTableType<TTable> {
        return this.formatTransformers.toDatabase(
            this.requestTableName,
            frontendData as unknown as Partial<GenerateTableType<TTable>>
        );
    }

    private convertToFrontend(
        databaseData: GenerateDatabaseTableType<TTable>
    ): GenerateFrontendTableType<TTable> {
        return this.formatTransformers.toFrontend(
            this.requestTableName,
            databaseData as unknown as Partial<GenerateTableType<TTable>>
        );
    }

    private applyQueryOptions(
        query: QueryBuilder,
        options: QueryOptions<TTable>
    ): QueryBuilder {
        if (options.filters) {
            for (const [key, value] of Object.entries(options.filters) as [keyof GenerateFrontendTableType<TTable>, any][]) {
                const dbFieldName = this.formatTransformers.toDatabase(
                    this.requestTableName,
                    { [key]: undefined }
                );
                query = query.eq(Object.keys(dbFieldName)[0], value);
            }
        }

        if (options.sorts) {
            for (const { column, ascending = true } of options.sorts) {
                const dbFieldName = this.formatTransformers.toDatabase(
                    this.requestTableName,
                    { [column]: undefined }
                );
                query = query.order(Object.keys(dbFieldName)[0], { ascending });
            }
        }

        if (options.limit) {
            query = query.limit(options.limit);
        }

        if (options.offset) {
            query = query.range(
                options.offset,
                options.offset + (options.limit || 0) - 1
            );
        }

        if (options.columns?.length) {
            const dbColumnNames = options.columns.map(column => {
                const dbFieldName = this.formatTransformers.toDatabase(
                    this.requestTableName,
                    { [column]: undefined }
                );
                return Object.keys(dbFieldName)[0];
            });
            // Using the base query's select to maintain proper typing
            query = this.client
                .from(this.tableNameDbFormat)
                .select(dbColumnNames.join(',')) as QueryBuilder;
        }

        return query;
    }

    private isPostgrestError(error: unknown): error is PostgrestError {
        return Boolean(
            error &&
            typeof error === 'object' &&
            'message' in error &&
            'code' in error &&
            typeof (error as any).message === 'string' &&
            typeof (error as any).code === 'string'
        );
    }

    protected async fetchSingle(
        query: QueryBuilder
    ): Promise<GenerateFrontendTableType<TTable> | null> {
        const { data, error } = await query.single();

        if (error || !data) {
            return null;
        }

        return this.formatTransformers.toFrontend(
            this.requestTableName,
            data
        );
    }

    async fetchByPrimaryKey(
        primaryKeyValue: string | number,
        options: Omit<QueryOptions<TTable>, 'limit' | 'offset'> = {}
    ): Promise<GenerateFrontendTableType<TTable> | null> {
        const primaryKeyDbName = Object.keys(
            this.formatTransformers.toDatabase(
                this.requestTableName,
                { [this.primaryKeyField]: undefined }
            )
        )[0];

        let query = this.buildBaseQuery().eq(primaryKeyDbName, primaryKeyValue);

        if (Object.keys(options).length > 0) {
            query = this.applyQueryOptions(query, options);
        }

        return this.fetchSingle(query);
    }


    static create<TTable extends TableKeys>(requestTableName: TableNameVariant): DatabaseApiWrapper<TTable> {
        const {schema, primaryKeyField, formatTransformers} = useTableWrapper(requestTableName);
        return new DatabaseApiWrapper<TTable>(
            requestTableName,
            tableNameDbFormat as TableNameDatabase<TTable>,
            schema as AutomationTable<TTable>,
            primaryKeyField as FieldKey<TTable>,
            formatTransformers
        );
    }

    async findOne(id: string | number): Promise<GenerateFrontendTableType<TTable> | null> {
        const databaseTableName = this.convertToDatabase({});
        const {data, error} = await this.client
            .from(Object.keys(databaseTableName)[0])
            .select('*')
            .eq(this.primaryKeyField, id)
            .single();

        if (error || !data) {
            return null;
        }

        return this.convertToFrontend(data as GenerateDatabaseTableType<TTable>);
    }


    async fetchByField<F extends StringFieldKey<T>>(
        fieldName: F,
        fieldValue: unknown,
        options: Omit<QueryOptions<T>, 'limit' | 'offset'> = {}
    ): Promise<Record<StringFieldKey<T>, unknown>[]> {
        const dbFieldName = getFieldNameMapping(
            this.requestTableName as T,
            fieldName,
            'database'
        );

        let query = this.client
            .from(this.databaseTableName)
            .select('*')
            .eq(dbFieldName, fieldValue);

        query = this.applyQueryOptions(query, options);

        try {
            const {data, error} = await query;
            if (error) throw error;
            return data ? data.map(item => this.convertResponse(item)) : [];
        } catch (error) {
            console.error(`Error fetching data by field ${fieldName}: ${error}`);
            return [];
        }
    }

    async fetchById<T extends keyof AutomationTableName>(
        dbTableName: DatabaseTableName,
        id: string,
        options: Omit<QueryOptions<T>, 'limit' | 'offset'>
    ): Promise<any> {
        let query = this.client.from(dbTableName).select('*').eq('id', id);
        query = this.applyQueryOptions(query, options, getSchema(dbTableName, 'database')!);
        const {data, error} = await query.single();
        if (error) {
            console.error(`Error fetching data for ${dbTableName}: ${error.message}`);
            return null;
        }
        return data;
    }


    private async fetchSimple(
        id: string,
        options: Omit<QueryOptions<T>, 'limit' | 'offset'>
    ): Promise<unknown | null> {
        const idField = getFieldNameMapping(
            this.requestTableName as T,
            'id' as StringFieldKey<T>,
            'database'
        );

        let query = this.client
            .from(this.databaseTableName)
            .select('*')
            .eq(idField, id);

        query = this.applyQueryOptions(query, options);

        try {
            const {data, error} = await query.single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error in fetchSimple: ${error}`);
            return null;
        }
    }

    async fetchOne(
        id: string,
        options: Omit<QueryOptions<T>, 'limit' | 'offset'> = {}
    ): Promise<Record<StringFieldKey<T>, unknown> | null> {
        const fetchStrategy = this.fullSchema.defaultFetchStrategy;
        let result = await this.fetchSimple(id, options);

        if (!result) return null;

        try {
            switch (fetchStrategy) {
                case 'simple':
                    return this.convertResponse(result);

                case 'fk':
                    result = await this.fetchFk(result);
                    break;

                case 'ifk':
                    result = await this.fetchIfk(result);
                    break;

                case 'm2m':
                    result = await this.fetchM2m(result);
                    break;

                case 'fkAndIfk':
                    result = await this.fetchFk(result);
                    result = await this.fetchIfk(result);
                    break;

                case 'm2mAndFk':
                    result = await this.fetchFk(result);
                    result = await this.fetchM2m(result);
                    break;

                case 'm2mAndIfk':
                    result = await this.fetchIfk(result);
                    result = await this.fetchM2m(result);
                    break;

                case 'fkIfkAndM2M':
                    result = await this.fetchFk(result);
                    result = await this.fetchIfk(result);
                    result = await this.fetchM2m(result);
                    break;

                default:
                    console.error(`Invalid fetch strategy: ${fetchStrategy}`);
                    return null;
            }

            return this.convertResponse(result);
        } catch (error) {
            console.error(`Error in fetchOne with strategy ${fetchStrategy}: ${error}`);
            return null;
        }
    }

    private async fetchFk(
        data: Record<string, unknown>,
    ): Promise<Record<string, unknown>> {
        const relationships = this.fullSchema.relationships;
        const foreignKeyRelationships = relationships.filter(
            rel => rel.relationshipType === 'foreignKey'
        );

        const foreignKeyQueries = foreignKeyRelationships.map(fk => {
            const mainTableColumn = getFieldNameMapping(
                this.requestTableName as T,
                fk.column as StringFieldKey<T>,
                'database'
            );
            const relatedTable = fk.relatedTable;
            const relatedColumn = fk.relatedColumn;

            return this.client
                .from(relatedTable)
                .select('*')
                .eq(relatedColumn, data[mainTableColumn]);
        });

        const foreignKeyResults = await Promise.all(foreignKeyQueries);

        foreignKeyResults.forEach((result, index) => {
            const {data: relatedData, error} = result;
            if (error) {
                console.error(
                    `Error fetching FK data for ${foreignKeyRelationships[index].relatedTable}: ${error.message}`
                );
                return;
            }
            data[foreignKeyRelationships[index].relatedTable] = relatedData;
        });

        return data;
    }

    private async fetchIfk(
        data: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const relationships = this.fullSchema.relationships;
        const inverseForeignKeyRelationships = relationships.filter(
            rel => rel.relationshipType === 'inverseForeignKey'
        );

        const inverseForeignKeyQueries = inverseForeignKeyRelationships.map(ifk => {
            const relatedTable = ifk.relatedTable;
            const relatedColumn = ifk.relatedColumn;
            const mainTableColumn = getFieldNameMapping(
                this.requestTableName as T,
                ifk.column as StringFieldKey<T>,
                'database'
            );

            return this.client
                .from(relatedTable)
                .select('*')
                .eq(relatedColumn, data[mainTableColumn]);
        });

        const inverseForeignKeyResults = await Promise.all(inverseForeignKeyQueries);

        inverseForeignKeyResults.forEach((result, index) => {
            const {data: relatedData, error} = result;
            if (error) {
                console.error(
                    `Error fetching IFK data for ${inverseForeignKeyRelationships[index].relatedTable}: ${error.message}`
                );
                return;
            }
            data[inverseForeignKeyRelationships[index].relatedTable] = relatedData;
        });

        return data;
    }

    private async fetchM2m(
        data: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const relationships = this.fullSchema.relationships;
        const manyToManyRelationships = relationships.filter(
            rel => rel.relationshipType === 'manyToMany'
        );

        const manyToManyQueries = manyToManyRelationships.map(m2m => {
            const idField = getFieldNameMapping(
                this.requestTableName as T,
                'id' as StringFieldKey<T>,
                'database'
            );

            if (!m2m.junctionTable) {
                throw new Error(`Junction table not defined for M2M relationship in ${this.requestTableName}`);
            }

            return this.client
                .from(m2m.junctionTable)
                .select('*')
                .eq(m2m.column, data[idField]);
        });

        const manyToManyResults = await Promise.all(manyToManyQueries);

        await Promise.all(
            manyToManyResults.map(async (result, index) => {
                const {data: junctionData, error} = result;
                if (error) {
                    console.error(
                        `Error fetching M2M junction table data for ${manyToManyRelationships[index].junctionTable}: ${error.message}`
                    );
                    return;
                }

                const m2m = manyToManyRelationships[index];
                const relatedDataQueries = junctionData.map(junctionRecord => {
                    return this.client
                        .from(m2m.relatedTable)
                        .select('*')
                        .eq('id', junctionRecord[m2m.relatedColumn]);
                });

                const relatedDataResults = await Promise.all(relatedDataQueries);
                data[m2m.relatedTable] = relatedDataResults
                    .filter(res => !res.error)
                    .map(res => res.data);
            })
        );

        return data;
    }

    async fetchAll(
        options: QueryOptions<T> = {}
    ): Promise<Record<StringFieldKey<T>, unknown>[]> {
        let query = this.client
            .from(this.databaseTableName)
            .select('*');

        query = this.applyQueryOptions(query, options);

        try {
            const {data, error} = await query;

            if (error) throw error;
            return data.map(item => this.convertResponse(item));
        } catch (error) {
            console.error(`Error in fetchAll: ${error}`);
            return [];
        }
    }

    async fetchPaginated<T extends DatabaseTableOrView>(
        tableName: TableName,
        options: QueryOptions<T>,
        page: number = 1,
        pageSize: number = 10,
        maxCount: number = 10000
    ): Promise<{
        page: number;
        allNamesAndIds?: { id: string; name: string }[];
        pageSize: number;
        totalCount: number;
        paginatedData: any[];
    }> {
        const dbTableName = this.getDatabaseTableName(tableName);
        const tableSchema = getSchema(tableName, 'database')!;

        options.limit = pageSize;
        options.offset = (page - 1) * pageSize;

        let query = this.client.from(dbTableName).select('*', {count: 'exact'});
        query = this.applyQueryOptions(query, options, tableSchema);

        const {data, error, count} = await query;
        if (error) {
            console.error(`Error fetching data: ${error.message}`);
            return {
                page,
                pageSize,
                totalCount: 0,
                paginatedData: []
            };
        }

        let allNamesAndIds: { id: string; name: string }[] | undefined;
        if (maxCount !== 0) {
            const idNameQuery = this.client.from(dbTableName).select('id, name').limit(maxCount);
            const {data: idNameData, error: idNameError} = await idNameQuery;
            if (idNameError) {
                console.error(`Error fetching names and IDs: ${idNameError.message}`);
            } else {
                allNamesAndIds = idNameData as { id: string; name: string }[];
            }
        }

        const paginatedData = data.map(item => {
            if (typeof item === 'string') {
                try {
                    return JSON.parse(item);
                } catch (parseError: any) {
                    console.error(`Failed to parse JSON string: ${parseError.message}`, item);
                    return null;
                }
            } else if (typeof item === 'object' && item !== null) {
                return this.convertResponse(item, tableName);
            } else {
                console.warn('Unexpected item type:', typeof item, item);
                return null;
            }
        });

        return {
            page,
            allNamesAndIds,
            pageSize,
            totalCount: count ?? 0,
            paginatedData
        };
    }

    async create<T extends keyof AutomationTableName>(tableName: TableName, data: Partial<any>): Promise<any> {
        const dbTableName = this.getDatabaseTableName(tableName);
        const tableSchema = getSchema(tableName, 'database')!;
        const dbData = convertData(data, 'frontend', 'database', tableName);
        const response = processDataForInsert(dbTableName, dbData);
        const processedData = response.processedData;
        const requiredMethod = response.callMethod;

        let result;

        // Delegate to the appropriate handler based on `requiredMethod`
        switch (requiredMethod) {
            case 'simple':
                result = await this.insertSimple(dbTableName, processedData);
                break;
            case 'fk': // This will handle both one and many FK cases
                result = await this.insertWithFk(dbTableName, processedData);
                break;
            case 'ifk': // This will handle both one and many IFK cases
                result = await this.insertWithIfk(dbTableName, processedData);
                break;
            case 'fkAndIfk': // This will handle combinations of FK and IFK (both one or many)
                result = await this.insertWithFkAndIfk(dbTableName, processedData);
                break;
            default:
                throw new Error('Invalid method for insertion');
        }

        return this.convertResponse(result, tableName);
    }

    async insertSimple(dbTableName: DatabaseTableName, processedData: any): Promise<any> {
        const {data: result, error} = await this.client.from(dbTableName).insert(processedData).select().single();
        if (error) throw error;
        return result;
    }

    async insertWithFk(dbTableName: DatabaseTableName, processedData: any): Promise<any> {
        const {data: result, error} = await this.client.from(dbTableName).insert(processedData).select().single();
        if (error) throw error;
        return result;
    }

    async insertWithIfk(dbTableName: DatabaseTableName, processedData: any): Promise<any> {
        const {data: primaryResult, error: primaryError} = await this.client
            .from(dbTableName)
            .insert(processedData)
            .select()
            .single();

        if (primaryError) throw primaryError;

        for (const relatedTable of processedData.relatedTables) {
            const relatedInsertData = {...relatedTable.data, related_column: primaryResult.id};
            const {error: relatedError} = await this.client
                .from(relatedTable.table)
                .insert(relatedInsertData)
                .select()
                .single();

            if (relatedError) throw relatedError;
        }

        return primaryResult;
    }


    async insertWithFkAndIfk(dbTableName: DatabaseTableName, processedData: any): Promise<any> {
        const {data: primaryResult, error: primaryError} = await this.client
            .from(dbTableName)
            .insert(processedData)
            .select()
            .single();

        if (primaryError) throw primaryError;

        for (const relatedTable of processedData.relatedTables) {
            const relatedInsertData = {...relatedTable.data, related_column: primaryResult.id};
            const {error: relatedError} = await this.client
                .from(relatedTable.table)
                .insert(relatedInsertData)
                .select()
                .single();

            if (relatedError) throw relatedError;
        }

        return primaryResult;
    }


    async update<T extends keyof AutomationTableName>(tableName: TableName, id: string, data: Partial<any>): Promise<any> {
        const dbTableName = this.getDatabaseTableName(tableName);
        const tableSchema = getSchema(tableName, 'database')!;
        const dbData = convertData(data, 'frontend', 'database', tableName);

        const {data: result, error} = await this.client
            .from(dbTableName)
            .update(dbData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.convertResponse(result, tableName);
    }

    async delete<T extends keyof AutomationTableName>(tableName: TableName, id: string): Promise<void> {
        const dbTableName = this.getDatabaseTableName(tableName);
        const tableSchema = getSchema(tableName, 'database')!;

        if (tableSchema.schemaType === 'view') {
            throw new Error(`Cannot delete from view: ${tableName}`);
        }

        const {error} = await this.client.from(dbTableName).delete().eq('id', id);

        if (error) throw error;
    }

    async executeCustomQuery<T extends keyof AutomationTableName>(
        tableName: TableName,
        query: (baseQuery: any) => any
    ): Promise<any[]> {
        const dbTableName = this.getDatabaseTableName(tableName);
        const baseQuery = this.client.from(dbTableName).select('*');
        const customQuery = query(baseQuery);

        const {data, error} = await customQuery;

        if (error) throw error;
        return data.map(item => this.convertResponse(item, tableName));
    }

    subscribeToChanges<T extends keyof AutomationTableName>(tableName: TableName, callback: SubscriptionCallback): void {
        const dbTableName = this.getDatabaseTableName(tableName);
        const tableSchema = getSchema(tableName, 'database')!;

        // Unsubscribe from existing subscription if any
        this.unsubscribeFromChanges(tableName);

        const subscription = this.client
            .channel(`public:${dbTableName}`)
            .on('postgres_changes', {event: '*', schema: 'public', table: dbTableName}, payload => {
                this.fetchAll(tableName).then(data => {
                    callback(data);
                }).catch(error => {
                    console.error('Error fetching updated data:', error);
                });
            })
            .subscribe();

        this.subscriptions.set(tableName, subscription);
    }

    unsubscribeFromChanges(tableName: TableName): void {
        const subscription = this.subscriptions.get(tableName);
        if (subscription) {
            this.client.removeChannel(subscription);
            this.subscriptions.delete(tableName);
        }
    }

    unsubscribeFromAllChanges(): void {
        this.subscriptions.forEach((subscription, name) => {
            this.client.removeChannel(subscription);
        });
        this.subscriptions.clear();
    }

    convertToFrontendFormat<T extends keyof AutomationTableName>(tableName: TableName, data: any): any {
        if (Array.isArray(data)) {
            return data.map(item => this.convertResponse(item, tableName));
        } else {
            return this.convertResponse(data, tableName);
        }
    }


    // buildQuery<T extends Record<string, any> = any>(queryName: string, table: string): PostgrestQueryBuilder<T> {
    //     const builder = this.client.from(table);
    //     this.queryBuilders.set(queryName, builder);
    //     return builder;
    // }
    //
    // getQuery<T extends Record<string, any> = any>(queryName: string): PostgrestQueryBuilder<T> | undefined {
    //     return this.queryBuilders.get(queryName) as PostgrestQueryBuilder<T> | undefined;
    // }
    //
    // async executeCustomQuery<T extends Record<string, any> = any>(
    //     queryName: string,
    //     params?: Partial<T>
    // ): Promise<PostgrestResponse<T>> {
    //     const builder = this.getQuery<T>(queryName);
    //     if (!builder) {
    //         throw new Error(`Query "${queryName}" not found`);
    //     }
    //
    //     let query = builder.select();
    //
    //     // Apply parameters if provided
    //     if (params) {
    //         Object.entries(params).forEach(([key, value]) => {
    //             query = query.eq(key, value);
    //         });
    //     }
    //
    //     return await query;
    // }
    //
    // async fetchSimpleWithRelations<T extends DatabaseTableOrView>(
    //     dbTableName: string,
    //     id: string,
    //     options: QueryOptions<T> & { relations?: string[] }
    // ): Promise<PostgrestSingleResponse<PostgrestMap>> {
    //     const queryName = `fetchSimpleWithRelations_${dbTableName}`;
    //     let builder = this.getQuery(queryName);
    //
    //     if (!builder) {
    //         builder = this.buildQuery(queryName, dbTableName);
    //     }
    //
    //     let query = builder.select('*').eq('id', id);
    //
    //     if (options.relations) {
    //         options.relations.forEach(relation => {
    //             query = query.select(`${relation}(*)`);
    //         });
    //     }
    //
    //     if (options.limit) {
    //         query = query.limit(options.limit);
    //     }
    //
    //     if (options.offset) {
    //         query = query.range(options.offset, options.offset + (options.limit || 1) - 1);
    //     }
    //
    //     if (options.sorts) {
    //         options.sorts.forEach(sort => {
    //             query = query.order(sort.column as string, { ascending: sort.ascending });
    //         });
    //     }
    //
    //     const response = await query.single();
    //     if (response.error) {
    //         console.error(`Error fetching data for ${dbTableName}: ${response.error.message}`);
    //         return { data: null, error: response.error };
    //     }
    //
    //     return {
    //         data: this.convertResponse(response.data, dbTableName as any),
    //         error: null
    //     };
    // }


    // async fetchFk<T extends DatabaseTableOrView>(
    //     dbTableName: string,
    //     data: any,
    //     tableSchema: TableSchema
    // ): Promise<any> {
    //     const foreignKeyQueries = tableSchema.relationships.foreignKeys.map(fk => {
    //         return this.client
    //             .from(fk.relatedTable)
    //             .select('*')
    //             .eq(fk.relatedColumn, data[fk.column]);
    //     });
    //
    //     const foreignKeyResults = await Promise.all(foreignKeyQueries);
    //     foreignKeyResults.forEach((result, index) => {
    //         const {data: relatedData, error} = result;
    //         if (error) {
    //             console.error(`Error fetching FK data for ${tableSchema.relationships.foreignKeys[index].relatedTable}: ${error.message}`);
    //             return;
    //         }
    //         data[tableSchema.relationships.foreignKeys[index].relatedTable] = relatedData;
    //     });
    //
    //     return data;
    // }
    //
    // async fetchIfk<T extends DatabaseTableOrView>(
    //     dbTableName: string,
    //     data: any,
    //     tableSchema: TableSchema
    // ): Promise<any> {
    //     const inverseForeignKeyQueries = tableSchema.relationships.inverseForeignKeys.map(ifk => {
    //         return this.client
    //             .from(ifk.relatedTable)
    //             .select('*')
    //             .eq(ifk.relatedColumn, data.id);
    //     });
    //
    //     const inverseForeignKeyResults = await Promise.all(inverseForeignKeyQueries);
    //     inverseForeignKeyResults.forEach((result, index) => {
    //         const {data: relatedData, error} = result;
    //         if (error) {
    //             console.error(`Error fetching IFK data for ${tableSchema.relationships.inverseForeignKeys[index].relatedTable}: ${error.message}`);
    //             return;
    //         }
    //         data[tableSchema.relationships.inverseForeignKeys[index].relatedTable] = relatedData;
    //     });
    //
    //     return data;
    // }
    //
    // async fetchM2m<T extends DatabaseTableOrView>(
    //     dbTableName: string,
    //     data: any,
    //     tableSchema: TableSchema
    // ): Promise<any> {
    //     const manyToManyQueries = tableSchema.relationships.manyToMany.map(m2m => {
    //         return this.client
    //             .from(m2m.junctionTable)
    //             .select('*')
    //             .eq('main_table_column', data.id);  // Assuming 'main_table_column' is the column in the junction table that relates to the main table
    //     });
    //
    //     const manyToManyResults = await Promise.all(manyToManyQueries);
    //
    //     await Promise.all(
    //         manyToManyResults.map(async (result, index) => {
    //             const {data: junctionData, error} = result;
    //             if (error) {
    //                 console.error(`Error fetching junction table data for ${tableSchema.relationships.manyToMany[index].junctionTable}: ${error.message}`);
    //                 return;
    //             }
    //
    //             const relatedDataQueries = junctionData.map(junctionRecord => {
    //                 return this.client
    //                     .from(tableSchema.relationships.manyToMany[index].relatedTable)
    //                     .select('*')
    //                     .eq('related_column', junctionRecord.related_column);
    //             });
    //
    //             const relatedDataResults = await Promise.all(relatedDataQueries);
    //             data[tableSchema.relationships.manyToMany[index].relatedTable] = relatedDataResults.map(res => res.data);
    //         })
    //     );
    //
    //     return data;
    // }
    //
    // async fetchWithFkAndIfk<T extends DatabaseTableOrView>(
    //     dbTableName: string,
    //     id: string,
    //     options: Omit<QueryOptions<T>, 'limit' | 'offset'>,
    //     tableSchema: TableSchema
    // ): Promise<any> {
    //     let data = await this.fetchSimple(dbTableName, id, options);
    //     if (!data) return null;
    //
    //     data = await this.fetchFk(dbTableName, data, tableSchema);
    //     if (!data) return null;
    //
    //     data = await this.fetchIfk(dbTableName, data, tableSchema);
    //     if (!data) return null;
    //
    //     return data;
    // }
    //
    // async fetchWithFkIfkAndM2M<T extends DatabaseTableOrView>(
    //     dbTableName: string,
    //     id: string,
    //     options: Omit<QueryOptions<T>, 'limit' | 'offset'>,
    //     tableSchema: TableSchema
    // ): Promise<any> {
    //     let data = await this.fetchSimple(dbTableName, id, options);
    //     if (!data) return null;
    //
    //     data = await this.fetchFk(dbTableName, data, tableSchema);
    //     if (!data) return null;
    //
    //     data = await this.fetchIfk(dbTableName, data, tableSchema);
    //     if (!data) return null;
    //
    //     data = await this.fetchM2m(dbTableName, data, tableSchema);
    //     if (!data) return null;
    //
    //     return data;
    // }
    //
    //
    // async fetchWithFkAndM2M<T extends DatabaseTableOrView>(
    //     dbTableName: string,
    //     id: string,
    //     options: Omit<QueryOptions<T>, 'limit' | 'offset'>,
    //     tableSchema: TableSchema
    // ): Promise<any> {
    //     let data = await this.fetchSimple(dbTableName, id, options);
    //     if (!data) return null;
    //
    //     data = await this.fetchFk(dbTableName, data, tableSchema);
    //     if (!data) return null;
    //
    //     data = await this.fetchM2m(dbTableName, data, tableSchema);
    //     if (!data) return null;
    //
    //     return data;
    // }
    //
    // async fetchWithIfkAndM2M<T extends DatabaseTableOrView>(
    //     dbTableName: string,
    //     id: string,
    //     options: Omit<QueryOptions<T>, 'limit' | 'offset'>,
    //     tableSchema: TableSchema
    // ): Promise<any> {
    //     let data = await this.fetchSimple(dbTableName, id, options);
    //     if (!data) return null;
    //
    //     data = await this.fetchIfk(dbTableName, data, tableSchema);
    //     if (!data) return null;
    //
    //     data = await this.fetchM2m(dbTableName, data, tableSchema);
    //     if (!data) return null;
    //
    //     return data;
    // }


}

// export const databaseApi = new DatabaseApiWrapper(supabase);
//
//
// type FilterOperator =
//     | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike'
//     | 'is' | 'in' | 'cs' | 'cd' | 'sl' | 'sr' | 'nxl' | 'nxr'
//     | 'adj' | 'ov' | 'fts' | 'plfts' | 'phfts' | 'wfts';
//
// type QueryBuilder<T extends Record<string, any> = any> = {
//     from: (table: ResolveDatabaseTableName) => QueryBuilder<T>;
//     select: (columns: DatabaseFieldName | DatabaseFieldName[]) => QueryBuilder<T>;
//     filter: (column: DatabaseFieldName, operator: FilterOperator, value: any) => QueryBuilder<T>;
//     order: (column: DatabaseFieldName, ascending?: boolean) => QueryBuilder<T>;
//     limit: (count: number) => QueryBuilder<T>;
//     offset: (count: number) => QueryBuilder<T>;
//     joinRelated: (table: ResolveDatabaseTableName) => QueryBuilder<T>;
//     execute: () => Promise<{ data: T[] | null; error: PostgrestError | null }>;
// };
//
// type PostgrestList = Array<Record<string, any>>;
// type PostgrestMap = Record<string, any>;


// function getApiWrapperSchemaFormats<T extends TableNameFrontend<TableName>>(
//     requestTableName: TableNameVariant
// ): ApiWrapperSchemaFormats<T> {
//     let globalCache = getGlobalCache(trace);
//
//     console.log('getApiWrapperSchemaFormats RequestTableName:', requestTableName);
//
//     if (!globalCache) {
//         globalCache = initializeSchemaSystem(trace);
//     }
//
//     if (!globalCache) throw new Error('Schema system not initialized');
//
//     const tableKey = resolveTableKey(requestTableName) as T;
//     console.log('getApiWrapperSchemaFormats TableKey:', tableKey);
//     const table = globalCache.schema[tableKey];
//     console.log('getApiWrapperSchemaFormats Table:', table);
//
//     if (!table) {
//         throw new Error(`Schema not found for table '${requestTableName}'`);
//     }
//
//     return {
//         schema: table,
//         frontendName: table.entityNameMappings.frontend as TableNameFrontend<T>,
//         databaseName: table.entityNameMappings.database as TableNameDatabase<T>
//     };
// }
