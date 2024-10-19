// utils/supabase/api-wrapper.ts

import {SupabaseClient} from '@supabase/supabase-js';
import {supabase} from '@/utils/supabase/client';
import { PostgrestError } from '@supabase/postgrest-js';
import {
    convertData, getApiWrapperSchemaFormats,
    getPrimaryKeyField,
    getSchema,
    processDataForInsert,
} from '../schema/schemaRegistry';
import {
    AnyTableName, ConverterMap,
    DatabaseFieldName,
    DatabaseTableSchema,
    FrontendTableSchema, ResolveDatabaseTableName, ResolveFrontendTableName, SchemaRegistry,
    TableSchema
} from "@/types/tableSchemaTypes";

export type QueryOptions<T extends DatabaseTableOrView> = {
    filters?: Partial<Record<keyof TableSchema['fields'], any>>;
    sorts?: Array<{ column: DatabaseFieldName; ascending?: boolean }>;
    limit?: number;
    offset?: number;
    columns?: Array<DatabaseFieldName>;
};

type SubscriptionCallback = (data: any[]) => void;


type FilterOperator =
    | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike'
    | 'is' | 'in' | 'cs' | 'cd' | 'sl' | 'sr' | 'nxl' | 'nxr'
    | 'adj' | 'ov' | 'fts' | 'plfts' | 'phfts' | 'wfts';

type QueryBuilder<T extends Record<string, any> = any> = {
    from: (table: DatabaseTableName) => QueryBuilder<T>;
    select: (columns: DatabaseFieldName | DatabaseFieldName[]) => QueryBuilder<T>;
    filter: (column: DatabaseFieldName, operator: FilterOperator, value: any) => QueryBuilder<T>;
    order: (column: DatabaseFieldName, ascending?: boolean) => QueryBuilder<T>;
    limit: (count: number) => QueryBuilder<T>;
    offset: (count: number) => QueryBuilder<T>;
    joinRelated: (table: DatabaseTableName) => QueryBuilder<T>;
    execute: () => Promise<{ data: T[] | null; error: PostgrestError | null }>;
};

type PostgrestList = Array<Record<string, any>>;
type PostgrestMap = Record<string, any>;

export type AllTableNames = string;


export interface ApiWrapperSchemaFormats {
    schema: TableSchema;
    frontend: FrontendTableSchema;
    database: DatabaseTableSchema;
}


export interface ApiWrapperSchemaFormats {
    schema: TableSchema;
    frontend: FrontendTableSchema;
    database: DatabaseTableSchema;
}

export interface ApiWrapperSchemaFormats {
    schema: TableSchema;
    frontend: FrontendTableSchema;
    database: DatabaseTableSchema;
}

class DatabaseApiWrapper<T extends keyof SchemaRegistry> {
    private client: SupabaseClient;
    private requestTableName: AnyTableName<T>;  // Now type-safe, accepting only valid table names in any format
    private fullSchema: TableSchema;  // Full schema object
    private frontendSchema: FrontendTableSchema;  // Frontend schema
    private databaseSchema: DatabaseTableSchema;  // Database schema
    private frontendTableName: ResolveFrontendTableName<T>;  // Frontend table name
    private databaseTableName: ResolveDatabaseTableName<T>;  // Database table name
    private primaryKeyField: keyof ConverterMap;  // The primary key field

    private subscriptions: Map<string, any> = new Map();
    private queryBuilders: Map<string, QueryBuilder> = new Map();

    constructor(client: SupabaseClient, requestTableName: AnyTableName<T>) {
        this.client = client;
        this.requestTableName = requestTableName;

        // Use getApiWrapperSchemaFormats to get the schema and validate it
        const { schema, frontend, database } = getApiWrapperSchemaFormats(requestTableName);
        if (!schema) {
            throw new Error(`Schema not found for table '${requestTableName}'.`);
        }

        this.fullSchema = schema;
        this.frontendSchema = frontend;
        this.databaseSchema = database;

        // Extract the frontend and database table names
        this.frontendTableName = frontend.frontendTableName;
        this.databaseTableName = database.databaseTableName;

        // Find the primary key field
        this.primaryKeyField = this.findPrimaryKeyField();
    }

    // Private method to find the primary key field in the schema
    private findPrimaryKeyField(): keyof ConverterMap {
        const primaryKeyEntry = Object.entries(this.fullSchema.fields).find(([_, field]) => field.isPrimaryKey);
        if (!primaryKeyEntry) {
            throw new Error(`Primary key not found for table '${this.requestTableName}'.`);
        }

        // Return the field key (which is the primary key)
        return primaryKeyEntry[0] as keyof ConverterMap;
    }




    private getDatabaseTableName(tableName: AllTableNames): DatabaseTableOrView {
        const tableSchema = getSchema(tableName, 'database');
        if (!this.fullSchema) {
            // throw new Error(`tableSchema not found for table or view: ${tableName}`);
            console.error(`tableSchema not found for table or view: ${tableName}`);
            return null;
        }
        return tableSchema.name.database as DatabaseTableOrView;
    }






    private handleError(error: any, context: string): any {
        if (error instanceof PostgrestError) {
            console.error(`PostgrestError in ${context}: ${error.message}`);
        } else if (error instanceof Error) {
            console.error(`Error in ${context}: ${error.message}`);
        } else {
            console.error(`Unknown error in ${context}: ${error}`);
        }

        return {
            error: true,
            message: `An error occurred while processing your request in ${context}.`,
        };
    }

    private convertRequest(data: any): any {
        return convertData({
            data,
            sourceFormat: 'frontend',
            targetFormat: 'database',
            tableName: this.requestTableName,
            options: undefined,
            processedEntities: undefined,
        });
    }

    private convertResponse(data: any): any {
        return convertData({
            data,
            sourceFormat: 'database',
            targetFormat: 'frontend',
            tableName: this.requestTableName,
            options: undefined,
            processedEntities: undefined,
        });
    }

    private applyQueryOptions<T extends DatabaseTableOrView>(
        query: any,
        options: QueryOptions<T>,
        tableSchema: TableSchema
    ): any {
        // Apply filters, sorts, limit, etc., with database field names
        if (options.filters) {
            for (const [key, value] of Object.entries(options.filters)) {
                const dbField = tableSchema.fields[key as DatabaseFieldName]?.alts.database;
                if (dbField) {
                    query = query.eq(dbField, value);
                }
            }
        }

        if (options.sorts) {
            for (const sort of options.sorts) {
                const dbField = tableSchema.fields[sort.column as DatabaseFieldName]?.alts.database;
                if (dbField) {
                    query = query.order(dbField, { ascending: sort.ascending ?? true });
                }
            }
        }

        if (options.limit) {
            query = query.limit(options.limit);
        }

        if (options.offset) {
            query = query.range(options.offset, options.offset + (options.limit || 0) - 1);
        }

        if (options.columns) {
            const dbColumns = options.columns
                .map((col) => tableSchema.fields[col as DatabaseFieldName]?.alts.database)
                .filter(Boolean);
            query = query.select(dbColumns.join(', '));
        }

        return query;
    }


    async fetchByPrimaryKey<T extends DatabaseTableOrView>(
        primaryKeyValue: string | number,
        options: Omit<QueryOptions<T>, 'limit' | 'offset'>
    ): Promise<any> {
        const { fieldName, message } = getPrimaryKeyField(this.requestTableName);

        if (message) {
            console.warn(message);
        }

        let query = this.client
            .from(this.requestTableName)
            .select('*')
            .eq(fieldName, primaryKeyValue);

        query = this.applyQueryOptions(query, options, getSchema(this.requestTableName, 'database')!);

        try {
            const { data, error } = await query.single();
            if (error) {
                throw error;
            }
            return this.convertResponse(data);
        } catch (error) {
            return this.handleError(error, `fetchByPrimaryKey for ${this.requestTableName}`);
        }
    }

    async fetchByField<T extends DatabaseTableOrView>(
        dbTableName: DatabaseTableName,
        fieldName: string,
        fieldValue: string | number,
        options: Omit<QueryOptions<T>, 'limit' | 'offset'>
    ): Promise<any[]> {
        let query = this.client.from(dbTableName).select('*').eq(fieldName, fieldValue);
        query = this.applyQueryOptions(query, options, getSchema(dbTableName, 'database')!);

        const { data, error } = await query;

        if (error) {
            console.error(`Error fetching data from ${dbTableName} where ${fieldName}=${fieldValue}: ${error.message}`);
            return [];
        }

        return data;
    }

    async fetchById<T extends DatabaseTableOrView>(
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


    async fetchSimple<T extends DatabaseTableOrView>(
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

    async fetchOne<T extends DatabaseTableOrView>(
        tableName: AllTableNames,
        id: string,
        options: Omit<QueryOptions<T>, 'limit' | 'offset'> = {}
    ): Promise<any> {
        const dbTableName = this.getDatabaseTableName(tableName);
        const tableSchema = getSchema(tableName, 'database')!;
        const fetchStrategy = tableSchema.relationships.fetchStrategy;

        let result = await this.fetchSimple(dbTableName, id, options);
        if (!result) return null;

        switch (fetchStrategy) {
            case 'simple':
                return this.convertResponse(result, tableName);

            case 'fk':
                result = await this.fetchFk(dbTableName, result, tableSchema);
                break;

            case 'ifk':
                result = await this.fetchIfk(dbTableName, result, tableSchema);
                break;

            case 'm2m':
                result = await this.fetchM2m(dbTableName, result, tableSchema);
                break;

            case 'fkAndIfk':
                result = await this.fetchFk(dbTableName, result, tableSchema);
                result = await this.fetchIfk(dbTableName, result, tableSchema);
                break;

            case 'm2mAndFk':
                result = await this.fetchFk(dbTableName, result, tableSchema);
                result = await this.fetchM2m(dbTableName, result, tableSchema);
                break;

            case 'm2mAndIfk':
                result = await this.fetchIfk(dbTableName, result, tableSchema);
                result = await this.fetchM2m(dbTableName, result, tableSchema);
                break;

            case 'fkIfkAndM2M':
                result = await this.fetchFk(dbTableName, result, tableSchema);
                result = await this.fetchIfk(dbTableName, result, tableSchema);
                result = await this.fetchM2m(dbTableName, result, tableSchema);
                break;

            default:
                console.error(`Invalid fetch strategy: ${fetchStrategy}`);
                return null;
        }

        return this.convertResponse(result, tableName);
    }

    async fetchFk<T extends DatabaseTableOrView>(
        dbTableName: DatabaseTableName,
        data: any,
        tableSchema: TableSchema
    ): Promise<any> {
        const foreignKeyQueries = tableSchema.relationships.foreignKeys.map(fk => {
            const mainTableColumn = tableSchema.fields[fk.column].alts.database;
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
                console.error(`Error fetching FK data for ${tableSchema.relationships.foreignKeys[index].relatedTable}: ${error.message}`);
                return;
            }
            data[tableSchema.relationships.foreignKeys[index].relatedTable] = relatedData;
        });

        return data;
    }

    async fetchIfk<T extends DatabaseTableOrView>(
        dbTableName: DatabaseTableName,
        data: any,
        tableSchema: TableSchema
    ): Promise<any> {
        const inverseForeignKeyQueries = tableSchema.relationships.inverseForeignKeys.map(ifk => {
            const relatedTable = ifk.relatedTable;
            const relatedColumn = ifk.relatedColumn;
            const mainTableColumn = ifk.mainTableColumn;

            return this.client
                .from(relatedTable)
                .select('*')
                .eq(relatedColumn, data[mainTableColumn]);
        });

        const inverseForeignKeyResults = await Promise.all(inverseForeignKeyQueries);

        inverseForeignKeyResults.forEach((result, index) => {
            const {data: relatedData, error} = result;
            if (error) {
                console.error(`Error fetching IFK data for ${tableSchema.relationships.inverseForeignKeys[index].relatedTable}: ${error.message}`);
                return;
            }
            data[tableSchema.relationships.inverseForeignKeys[index].relatedTable] = relatedData;
        });

        return data;
    }

    async fetchM2m<T extends DatabaseTableOrView>(
        dbTableName: DatabaseTableName,
        data: any,
        tableSchema: TableSchema
    ): Promise<any> {
        const manyToManyQueries = tableSchema.relationships.manyToMany.map(m2m => {
            const junctionTable = m2m.junctionTable;
            const mainTableColumn = m2m.mainTableColumn;
            const relatedTableColumn = m2m.relatedTableColumn;

            return this.client
                .from(junctionTable)
                .select('*')
                .eq(mainTableColumn, data[tableSchema.fields['id'].alts.database]);
        });

        const manyToManyResults = await Promise.all(manyToManyQueries);

        await Promise.all(
            manyToManyResults.map(async (result, index) => {
                const {data: junctionData, error} = result;
                if (error) {
                    console.error(`Error fetching M2M junction table data for ${tableSchema.relationships.manyToMany[index].junctionTable}: ${error.message}`);
                    return;
                }

                const relatedDataQueries = junctionData.map(junctionRecord => {
                    const relatedTable = tableSchema.relationships.manyToMany[index].relatedTable;
                    const relatedTableColumn = tableSchema.relationships.manyToMany[index].relatedTableColumn;

                    return this.client
                        .from(relatedTable)
                        .select('*')
                        .eq('id', junctionRecord[relatedTableColumn]);
                });

                const relatedDataResults = await Promise.all(relatedDataQueries);
                data[tableSchema.relationships.manyToMany[index].relatedTable] = relatedDataResults.map(res => res.data);
            })
        );

        return data;
    }

    async fetchAll<T extends DatabaseTableOrView>(
        tableName: AllTableNames,
        options: Omit<QueryOptions<T>, 'limit' | 'offset'> = {}
    ): Promise<any[]> {
        const dbTableName = this.getDatabaseTableName(tableName);
        const tableSchema = getSchema(tableName, 'database')!;

        let query = this.client.from(dbTableName).select('*');
        query = this.applyQueryOptions(query, options, tableSchema);

        const {data, error} = await query;

        if (error) throw error;
        return data.map(item => this.convertResponse(item, tableName));
    }

    async fetchPaginated<T extends DatabaseTableOrView>(
        tableName: AllTableNames,
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

    async create<T extends DatabaseTableOrView>(tableName: AllTableNames, data: Partial<any>): Promise<any> {
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


    async update<T extends DatabaseTableOrView>(tableName: AllTableNames, id: string, data: Partial<any>): Promise<any> {
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

    async delete<T extends DatabaseTableOrView>(tableName: AllTableNames, id: string): Promise<void> {
        const dbTableName = this.getDatabaseTableName(tableName);
        const tableSchema = getSchema(tableName, 'database')!;

        if (tableSchema.schemaType === 'view') {
            throw new Error(`Cannot delete from view: ${tableName}`);
        }

        const {error} = await this.client.from(dbTableName).delete().eq('id', id);

        if (error) throw error;
    }

    async executeCustomQuery<T extends DatabaseTableOrView>(
        tableName: AllTableNames,
        query: (baseQuery: any) => any
    ): Promise<any[]> {
        const dbTableName = this.getDatabaseTableName(tableName);
        const baseQuery = this.client.from(dbTableName).select('*');
        const customQuery = query(baseQuery);

        const {data, error} = await customQuery;

        if (error) throw error;
        return data.map(item => this.convertResponse(item, tableName));
    }

    subscribeToChanges<T extends DatabaseTableOrView>(tableName: AllTableNames, callback: SubscriptionCallback): void {
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

    unsubscribeFromChanges(tableName: AllTableNames): void {
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

    convertToFrontendFormat<T extends DatabaseTableOrView>(tableName: AllTableNames, data: any): any {
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

export const databaseApi = new DatabaseApiWrapper(supabase);



