// utils/supabase/api-wrapper.ts
import {PostgrestError, PostgrestFilterBuilder} from '@supabase/postgrest-js';
import {SupabaseClient} from "@supabase/supabase-js";
import {useSchemaResolution, useTableSchema} from "@/providers/SchemaProvider";
import {supabase} from "@/utils/supabase/client";
import {
    AllEntityNameVariations, AutomationEntity,
    convertFormat, createFormattedRecord,
    EntityFieldKeys,
    EntityKeys,
    EntityNameFormat,
    EntityRecord
} from "@/types/entityTypes";

const defaultTrace = [__filename.split('/').pop() || 'unknownFile']; // In a Node.js environment
const trace: string[] = ['anotherFile'];

type QueryBuilder = PostgrestFilterBuilder<any, any, any>;

type QueryOptions<TEntity extends EntityKeys> = {
    filters?: Partial<EntityRecord<TEntity, 'database'>>;
    sorts?: Array<{
        column: EntityFieldKeys<TEntity>;
        ascending?: boolean;
    }>;
    limit?: number;
    offset?: number;
    columns?: Array<EntityFieldKeys<TEntity>>;
};


export class DatabaseApiWrapper<TEntity extends EntityKeys> {
    private client?: SupabaseClient;  // Client is optional during initialization
    private readonly entityVariant: AllEntityNameVariations;
    private readonly tableSchema: AutomationEntity<TEntity>;
    private readonly entityKey: TEntity;
    private readonly databaseName: EntityNameFormat<TEntity, 'database'>;
    private readonly primaryKeyField: EntityFieldKeys<TEntity>;
    private readonly formatTransformers: ReturnType<typeof useSchemaResolution>['formatTransformers'];
    private readonly resolveFieldNameInFormat: ReturnType<typeof useSchemaResolution>['resolveFieldNameInFormat'];
    private readonly subscriptions: Map<string, unknown> = new Map();
    private readonly queryBuilders: Map<string, unknown> = new Map();

    // Constructor does not expect a client, it can be injected later
    constructor(
        entityVariant: AllEntityNameVariations,
        schema: AutomationEntity<TEntity>,
        entityKey: TEntity,
        databaseName: EntityNameFormat<TEntity, 'database'>,
        primaryKeyField: EntityFieldKeys<TEntity>,
        formatTransformers: ReturnType<typeof useSchemaResolution>['formatTransformers'],
        resolveFieldNameInFormat: ReturnType<typeof useSchemaResolution>['resolveFieldNameInFormat']
    ) {
        this.entityVariant = entityVariant;
        this.tableSchema = schema;
        this.entityKey = entityKey;
        this.databaseName = databaseName;
        this.primaryKeyField = primaryKeyField;
        this.formatTransformers = formatTransformers;
        this.resolveFieldNameInFormat = resolveFieldNameInFormat;
    }

    // Static factory method for initialization without client
    static create<TEntity extends EntityKeys>(entityVariant: AllEntityNameVariations): DatabaseApiWrapper<TEntity> {
        const {
            schema,
            resolveEntityKey,
            getEntityNameInFormat,
            findPrimaryKeyFieldKey,
            resolveFieldNameInFormat,
            formatTransformers
        } = useSchemaResolution();  // Fetch everything from the schema resolution system

        const entityKey = resolveEntityKey(entityVariant) as TEntity;
        const tableSchema = schema[entityKey] as AutomationEntity<TEntity>;
        const primaryKeyField = findPrimaryKeyFieldKey(entityKey);
        const tableNameDbFormat = getEntityNameInFormat(entityKey, 'database');

        if (!primaryKeyField) {
            throw new Error(`No primary key found for entity ${entityVariant}`);
        }

        // Initialize and return the instance of DatabaseApiWrapper (without client)
        return new DatabaseApiWrapper<TEntity>(
            entityVariant,
            tableSchema,
            entityKey,
            tableNameDbFormat as EntityNameFormat<TEntity, 'database'>,
            primaryKeyField as EntityFieldKeys<TEntity>,
            formatTransformers,
            resolveFieldNameInFormat
        );
    }

    // Inject client (used for client-side or server-side)
    setClient(client: SupabaseClient) {
        this.client = client;
    }

    // Example query method that uses the injected client
    private buildBaseQuery(): PostgrestFilterBuilder<any, any, any> {
        if (!this.client) {
            throw new Error('Supabase client not initialized');
        }
        return this.client.from(this.databaseName).select('*');
    }

    /**
     * Apply query options like filters and sorts to a query
     */
    private applyQueryOptions(
        query: PostgrestFilterBuilder<any, any, any>,
        options: QueryOptions<TEntity>
    ): PostgrestFilterBuilder<any, any, any> {
        if (options.filters) {
            for (const [key, value] of Object.entries(options.filters)) {
                const dbFieldName = this.resolveFieldNameInFormat(
                    this.entityKey,
                    key as EntityFieldKeys<TEntity>,
                    'database'
                );
                query = query.eq(dbFieldName, value);
            }
        }

        if (options.sorts) {
            for (const {column, ascending = true} of options.sorts) {
                const dbFieldName = this.resolveFieldNameInFormat(
                    this.entityKey,
                    column,
                    'database'
                );
                query = query.order(dbFieldName, {ascending});
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
            const dbColumnNames = options.columns.map(column =>
                this.resolveFieldNameInFormat(this.entityKey, column, 'database')
            );
            query = this.client
                .from(this.databaseName)
                .select(dbColumnNames.join(','));
        }

        return query;
    }

    private convertToDatabase(
        frontendData: EntityRecord<TEntity, 'frontend'>
    ): EntityRecord<TEntity, 'database'> {
        return convertFormat(
            this.entityKey,
            frontendData,
            'database'
        );
    }

    /**
     * Converts database data to frontend format
     */
    private convertToFrontend(
        databaseData: EntityRecord<TEntity, 'database'>
    ): EntityRecord<TEntity, 'frontend'> {
        return convertFormat(
            this.entityKey,
            databaseData,
            'frontend'
        );
    }

    /**
     * Converts array of records
     */
    private convertArrayToFrontend(
        databaseData: EntityRecord<TEntity, 'database'>[]
    ): EntityRecord<TEntity, 'frontend'>[] {
        return databaseData.map(record =>
            this.convertToFrontend(record)
        );
    }

    /**
     * Example query method with full type safety
     */
    async getById(id: string | number): Promise<EntityRecord<TEntity, 'frontend'> | null> {
        const {data, error} = await this.buildBaseQuery()
            .eq(this.primaryKeyField, id)
            .single();

        if (error || !data) return null;

        // Ensure that data is typed as Record<string, unknown>
        const dbRecord = createFormattedRecord(
            this.entityKey,
            data as Record<string, unknown>,
            'database'
        );

        return this.convertToFrontend(dbRecord);
    }

    /**
     * Example insert method with full type safety
     */
    async insert(
        frontendData: EntityRecord<TEntity, 'frontend'>
    ): Promise<EntityRecord<TEntity, 'frontend'> | null> {
        // Convert the frontend data to database format
        const dbData = this.convertToDatabase(frontendData);

        // Insert the data using correct typing and method
        const {data, error} = await this.client
            .from(this.databaseName)
            .insert(dbData)
            .single();

        if (error || !data) return null;

        // Ensure that data is typed as Record<string, unknown>
        const dbRecord = createFormattedRecord(
            this.entityKey,
            data as Record<string, unknown>,
            'database'
        );

        return this.convertToFrontend(dbRecord);
    }

    /**
     * Fetch a single record with type safety and full format conversion
     */
    protected async fetchSingle(
        query: PostgrestFilterBuilder<any, any, any>
    ): Promise<EntityRecord<TEntity, 'frontend'> | null> {
        const {data, error} = await query.single();

        if (error || !data) return null;

        // Ensure that data is typed as Record<string, unknown>
        const dbRecord = createFormattedRecord(
            this.entityKey,
            data as Record<string, unknown>,
            'database'
        );

        return this.convertToFrontend(dbRecord);
    }

    /**
     * Fetch a record by its primary key with flexible query options
     */
    async fetchByPrimaryKey(
        primaryKeyValue: string | number,
        options: Omit<QueryOptions<TEntity>, 'limit' | 'offset'> = {}
    ): Promise<EntityRecord<TEntity, 'frontend'> | null> {
        // Get the primary key field name in 'database' format
        const primaryKeyDbName = Object.keys(
            this.formatTransformers.toDatabase(
                this.entityVariant,
                {[this.primaryKeyField]: undefined}
            )
        )[0];

        // Build the base query, filtering by primary key
        let query = this.buildBaseQuery().eq(primaryKeyDbName, primaryKeyValue);

        // Apply additional query options, if provided
        if (Object.keys(options).length > 0) {
            query = this.applyQueryOptions(query, options);
        }

        // Fetch the single record
        return this.fetchSingle(query);
    }


    async findOne(id: string | number): Promise<EntityRecord<TEntity, 'frontend'> | null> {
        const {data, error} = await this.buildBaseQuery()
            .eq(this.primaryKeyField, id)
            .single();

        if (error || !data) {
            return null;
        }

        // Convert the fetched data from 'database' to 'frontend' format
        const dbRecord = createFormattedRecord(
            this.entityKey,
            data as Record<string, unknown>,
            'database'
        );

        return this.convertToFrontend(dbRecord);
    }


    async fetchByField<TField extends EntityFieldKeys<TEntity>>(
        fieldName: TField,
        fieldValue: unknown,
        options: Omit<QueryOptions<TEntity>, 'limit' | 'offset'> = {}
    ): Promise<EntityRecord<TEntity, 'frontend'>[]> {
        const dbFieldName = this.resolveFieldNameInFormat(
            this.entityKey,
            fieldName,
            'database'
        );

        let query = this.buildBaseQuery().eq(dbFieldName, fieldValue);  // Correct usage of fieldName

        query = this.applyQueryOptions(query, options);

        try {
            const {data, error} = await query;
            if (error) throw error;

            // Ensure data is converted to 'frontend' format
            return data ? this.convertArrayToFrontend(data as EntityRecord<TEntity, 'database'>[]) : [];
        } catch (error) {
            console.error(`Error fetching data by field ${fieldName}: ${error}`);
            return [];
        }
    }

    async fetchById(
        dbTableName: EntityNameFormat<TEntity, 'database'>,
        id: string | number,
        options: Omit<QueryOptions<TEntity>, 'limit' | 'offset'> = {}
    ): Promise<EntityRecord<TEntity, 'frontend'> | null> {
        let query = this.client.from(dbTableName).select('*').eq(this.primaryKeyField, id);

        query = this.applyQueryOptions(query, options);

        const {data, error} = await query.single();

        if (error) {
            console.error(`Error fetching data for ${dbTableName}: ${error.message}`);
            return null;
        }
        const dbRecord = createFormattedRecord(
            this.entityKey,
            data as Record<string, unknown>,
            'database'
        );

        return this.convertToFrontend(dbRecord);
    }


    private async fetchSimple(
        id: string,
        options: Omit<QueryOptions<TEntity>, 'limit' | 'offset'>
    ): Promise<EntityRecord<TEntity, 'frontend'> | null> {
        const idField = this.resolveFieldNameInFormat(
            this.entityKey,
            'id' as EntityFieldKeys<TEntity>,
            'database'
        );

        let query = this.buildBaseQuery().eq(idField, id);

        query = this.applyQueryOptions(query, options);

        try {
            const {data, error} = await query.single();
            if (error) throw error;

            return this.convertToFrontend(
                createFormattedRecord(this.entityKey, data as Record<string, unknown>, 'database')
            );
        } catch (error) {
            console.error(`Error in fetchSimple: ${error}`);
            return null;
        }
    }

    async fetchOne(
        id: string | number,
        options: Omit<QueryOptions<TEntity>, 'limit' | 'offset'> = {}
    ): Promise<EntityRecord<TEntity, 'frontend'> | null> {
        // Fetch strategy from the schema (e.g., 'fk', 'ifk', 'm2m', etc.)
        const fetchStrategy = this.tableSchema.defaultFetchStrategy;

        // Fetch the primary record using `fetchSimple`
        let result = await this.fetchSimple(id, options);

        if (!result) return null;

        try {
            // Apply the fetch strategy based on relationships (FK, IFK, M2M, etc.)
            switch (fetchStrategy) {
                case 'simple':
                    return this.convertToFrontend(result);  // Convert and return simple result

                case 'fk':
                    result = await this.fetchFk(result);  // Fetch related FK data
                    break;

                case 'ifk':
                    result = await this.fetchIfk(result);  // Fetch related IFK data
                    break;

                case 'm2m':
                    result = await this.fetchM2m(result);  // Fetch related M2M data
                    break;

                case 'fkAndIfk':
                    result = await this.fetchFk(result);  // Fetch FK data
                    result = await this.fetchIfk(result);  // Fetch IFK data
                    break;

                case 'm2mAndFk':
                    result = await this.fetchFk(result);  // Fetch FK data
                    result = await this.fetchM2m(result);  // Fetch M2M data
                    break;

                case 'm2mAndIfk':
                    result = await this.fetchIfk(result);  // Fetch IFK data
                    result = await this.fetchM2m(result);  // Fetch M2M data
                    break;

                case 'fkIfkAndM2M':
                    result = await this.fetchFk(result);  // Fetch FK data
                    result = await this.fetchIfk(result);  // Fetch IFK data
                    result = await this.fetchM2m(result);  // Fetch M2M data
                    break;

                default:
                    console.error(`Invalid fetch strategy: ${fetchStrategy}`);
                    return null;
            }

            // Convert the final result back to frontend format
            return this.convertToFrontend(result);
        } catch (error) {
            console.error(`Error in fetchOne with strategy ${fetchStrategy}: ${error}`);
            return null;
        }
    }

    private async fetchFk(
        data: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const relationships = this.tableSchema.relationships;
        const foreignKeyRelationships = relationships.filter(
            rel => rel.relationshipType === 'foreignKey'
        );

        const foreignKeyQueries = foreignKeyRelationships.map(fk => {
            const mainTableColumn = this.resolveFieldNameInFormat(
                this.entityKey,
                fk.column as EntityFieldKeys<TEntity>,
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
        const relationships = this.tableSchema.relationships;
        const inverseForeignKeyRelationships = relationships.filter(
            rel => rel.relationshipType === 'inverseForeignKey'
        );

        const inverseForeignKeyQueries = inverseForeignKeyRelationships.map(ifk => {
            const relatedTable = ifk.relatedTable;
            const relatedColumn = ifk.relatedColumn;
            const mainTableColumn = this.resolveFieldNameInFormat(
                this.entityKey,
                ifk.column as EntityFieldKeys<TEntity>,
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
        const relationships = this.tableSchema.relationships;
        const manyToManyRelationships = relationships.filter(
            rel => rel.relationshipType === 'manyToMany'
        );

        const manyToManyQueries = manyToManyRelationships.map(m2m => {
            const idField = this.resolveFieldNameInFormat(
                this.entityKey,
                'id' as EntityFieldKeys<TEntity>,  // Ensure this maps to the primary key
                'database'
            );

            if (!m2m.junctionTable) {
                throw new Error(`Junction table not defined for M2M relationship in ${this.entityKey}`);
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
                        .eq(m2m.relatedColumn, junctionRecord[m2m.relatedColumn]);
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
        options: QueryOptions<TEntity> = {}
    ): Promise<EntityRecord<TEntity, 'frontend'>[]> {
        let query = this.buildBaseQuery();

        query = this.applyQueryOptions(query, options);

        try {
            const {data, error} = await query;

            if (error) throw error;

            return data ? this.convertArrayToFrontend(data as EntityRecord<TEntity, 'database'>[]) : [];
        } catch (error) {
            console.error(`Error in fetchAll: ${error}`);
            return [];
        }
    }

    async fetchPaginated(
        options: QueryOptions<TEntity>,
        page: number = 1,
        pageSize: number = 10,
        maxCount: number = 10000
    ): Promise<{
        page: number;
        pageSize: number;
        totalCount: number;
        maxCount: number;
        data: EntityRecord<TEntity, 'frontend'>[];
    }> {
        const fullOptions = {
            ...options,
            limit: pageSize,
            offset: (page - 1) * pageSize
        };

        let query = this.buildBaseQuery();
        query = this.applyQueryOptions(query, fullOptions);

        const {data, error, count} = await query;

        if (error) throw error;

        const formattedData = data.map(item =>
            createFormattedRecord(this.entityKey, item, 'database')
        );

        const frontendData = formattedData.map(record =>
            convertFormat(this.entityKey, record, 'frontend')
        );

        return {
            page,
            pageSize,
            totalCount: count ?? 0,
            data: frontendData,
            maxCount
        };
    }


    async fetchPaginatedOld<T extends DatabaseTableOrView>(
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

    async create<TEntity extends EntityKeys>(
        data: Partial<EntityRecord<TEntity, 'frontend'>>
    ): Promise<EntityRecord<TEntity, 'frontend'> | null> {
        // Convert the frontend data to database format
        const dbData = this.convertToDatabase(data as EntityRecord<TEntity, 'frontend'>);

        // Determine the correct insertion method based on schema and relationships
        const response = this.processDataForInsert(this.entityKey, dbData);
        const processedData = response.processedData;
        const requiredMethod = response.callMethod;

        let result;

        // Delegate to the appropriate handler based on the `requiredMethod`
        switch (requiredMethod) {
            case 'simple':
                result = await this.insertSimple(this.databaseName, processedData);
                break;
            case 'fk':
                result = await this.insertWithFk(this.databaseName, processedData);
                break;
            case 'ifk':
                result = await this.insertWithIfk(this.databaseName, processedData);
                break;
            case 'fkAndIfk':
                result = await this.insertWithFkAndIfk(this.databaseName, processedData);
                break;
            default:
                throw new Error('Invalid method for insertion');
        }

        // Convert the result back to frontend format
        return this.convertToFrontend(result);
    }

    /**
     * Insert method for simple inserts without FK or IFK relationships.
     */
    async insertSimple(
        dbTableName: EntityNameFormat<TEntity, 'database'>,
        processedData: EntityRecord<TEntity, 'database'>
    ): Promise<EntityRecord<TEntity, 'database'> | null> {
        const {data, error} = await this.client
            .from(dbTableName)
            .insert(processedData)
            .select()
            .single();

        if (error) throw error;
        return data as EntityRecord<TEntity, 'database'>;
    }

    /**
     * Insert method for inserts that involve foreign key (FK) relationships.
     */
    async insertWithFk(
        dbTableName: EntityNameFormat<TEntity, 'database'>,
        processedData: EntityRecord<TEntity, 'database'>
    ): Promise<EntityRecord<TEntity, 'database'> | null> {
        // Insert the primary data
        const {data: result, error} = await this.client
            .from(dbTableName)
            .insert(processedData)
            .select()
            .single();

        if (error) throw error;

        // Handle related tables (FK relationships)
        // Placeholder: Related table inserts based on FK relationships.
        await this.handleForeignKeyRelations(result);

        return result;
    }

    /**
     * Insert method for inserts that involve intermediate foreign key (IFK) relationships.
     */
    async insertWithIfk(
        dbTableName: EntityNameFormat<TEntity, 'database'>,
        processedData: any
    ): Promise<EntityRecord<TEntity, 'database'> | null> {
        const {data: primaryResult, error: primaryError} = await this.client
            .from(dbTableName)
            .insert(processedData)
            .select()
            .single();

        if (primaryError) throw primaryError;

        // Handle related tables with IFK relationships
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

    /**
     * Insert method that handles both FK and IFK relationships.
     */
    async insertWithFkAndIfk(
        dbTableName: EntityNameFormat<TEntity, 'database'>,
        processedData: any
    ): Promise<EntityRecord<TEntity, 'database'> | null> {
        const {data: primaryResult, error: primaryError} = await this.client
            .from(dbTableName)
            .insert(processedData)
            .select()
            .single();

        if (primaryError) throw primaryError;

        // Handle related tables with both FK and IFK relationships
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

    /**
     * Placeholder method to handle related tables based on foreign key (FK) relationships.
     * You need to implement the logic that fetches the correct related tables and handles inserts.
     */
    private async handleForeignKeyRelations(result: EntityRecord<TEntity, 'database'>) {
        // Placeholder: Implement logic to fetch related tables based on FK relationships
        // and perform necessary inserts or updates in the related tables.
    }


    async update(
        id: string | number,
        data: Partial<EntityRecord<TEntity, 'frontend'>>
    ): Promise<EntityRecord<TEntity, 'frontend'> | null> {
        // Convert frontend data to database format
        const dbData = this.convertToDatabase(data as EntityRecord<TEntity, 'frontend'>);

        // Build the query
        const query = this.buildBaseQuery()
            .eq(this.primaryKeyField, id)  // Use the primary key field dynamically
            .update(dbData);

        const { data: result, error } = await query.select().single();

        if (error) throw error;

        // Convert the result back to frontend format and return
        return this.convertToFrontend(result as EntityRecord<TEntity, 'database'>);
    }

    async delete(id: string | number): Promise<void> {
        // Ensure the table is not a view
        if (this.tableSchema.schemaType === 'view') {
            throw new Error(`Cannot delete from view: ${this.databaseName}`);
        }

        // Build the delete query
        const query = this.buildBaseQuery()
            .eq(this.primaryKeyField, id)
            .delete();

        const { error } = await query;

        if (error) throw error;
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


    async executeCustomQuery(
        query: (baseQuery: PostgrestFilterBuilder<any, any, any>) => any
    ): Promise<EntityRecord<TEntity, 'frontend'>[]> {
        // Start with a base query
        const baseQuery = this.buildBaseQuery();

        // Apply the custom query
        const customQuery = query(baseQuery);

        const { data, error } = await customQuery;

        if (error) throw error;

        // Convert results to frontend format
        return this.convertArrayToFrontend(data as EntityRecord<TEntity, 'database'>[]);
    }

    subscribeToChanges(callback: SubscriptionCallback): void {
        // Unsubscribe from existing subscription if any
        this.unsubscribeFromChanges();

        // Create a subscription to changes on this table
        const subscription = this.client
            .channel(`public:${this.databaseName}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: this.databaseName }, async () => {
                try {
                    const data = await this.fetchAll();
                    callback(data);
                } catch (error) {
                    console.error('Error fetching updated data:', error);
                }
            })
            .subscribe();

        // Store the subscription
        this.subscriptions.set(this.entityKey, subscription);
    }

    unsubscribeFromChanges(): void {
        const subscription = this.subscriptions.get(this.entityKey);
        if (subscription) {
            this.client.removeChannel(subscription);
            this.subscriptions.delete(this.entityKey);
        }
    }

    unsubscribeFromAllChanges(): void {
        this.subscriptions.forEach((subscription) => {
            this.client.removeChannel(subscription);
        });
        this.subscriptions.clear();
    }

    convertToFrontendFormat(data: any): any {
        if (Array.isArray(data)) {
            return this.convertArrayToFrontend(data as EntityRecord<TEntity, 'database'>[]);
        } else {
            return this.convertToFrontend(data as EntityRecord<TEntity, 'database'>);
        }
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
//
//
// }
//
//
// function getFieldNameInFormat(entityKey: string, arg1: EntityFieldKeys<TEntity>, arg2: string) {
//     throw new Error('Function not implemented.');
// }

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
// export function useTableWrapper(entityVariant: AllEntityNameVariations) {
//     // Get schema-related information using useTableSchema
//     const {
//         tableKey,
//         tableSchema,
//         primaryKeyField,
//         tableNameDbFormat
//     } = useTableSchema(entityVariant);  // Pass entityVariant to useTableSchema
//
//     // Get additional schema resolution helpers
//     const {
//         resolveEntityKey,
//         getEntityNameInFormat,
//         findPrimaryKeyFieldKey,
//         getFieldNameInFormat,
//         resolveFieldNameInFormat,
//         formatTransformers
//     } = useSchemaResolution();
//
//     // Return all necessary data for use in the DatabaseApiWrapper
//     return {
//         tableKey, // The resolved table key (TEntity)
//         schema: tableSchema, // The table schema
//         primaryKeyField, // The primary key field
//         tableNameDbFormat, // The name of the table in the database format
//         resolveEntityKey, // Helper function to resolve entity keys
//         getEntityNameInFormat, // Helper function to get the name of the entity in different formats
//         findPrimaryKeyFieldKey, // Helper function to find the primary key field key
//         getFieldNameInFormat, // Helper function to get field names in different formats
//         resolveFieldNameInFormat, // Helper function to resolve field names in different formats
//         formatTransformers // Formatting helpers for conversion between formats
//     } as const;
// }
//

