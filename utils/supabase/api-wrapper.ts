import { SupabaseClient } from '@supabase/supabase-js';
import {
    convertData,
    getSchema,
    TableSchema,
    getRegisteredSchemas,
    processDataForInsert
} from "@/utils/schema/schemaRegistry";
import { supabase } from '@/utils/supabase/client';

const availableSchemas = getRegisteredSchemas('database');
export type TableOrView = typeof availableSchemas[number];

export type QueryOptions<T extends TableOrView> = {
    filters?: Partial<Record<keyof TableSchema['fields'], any>>;
    sorts?: Array<{ column: keyof TableSchema['fields']; ascending?: boolean }>;
    limit?: number;
    offset?: number;
    columns?: Array<keyof TableSchema['fields']>;
};

type SubscriptionCallback = (data: any[]) => void;

class DatabaseApiWrapper {
    private client: SupabaseClient;
    private subscriptions: Map<string, any> = new Map();

    constructor(client: SupabaseClient) {
        this.client = client;
    }

    private getDatabaseTableName<T extends TableOrView>(name: T): string {
        const schema = getSchema(name, 'database');
        if (!schema) {
            throw new Error(`Schema not found for table or view: ${name}`);
        }
        return schema.name.database;
    }

    private applyQueryOptions<T extends TableOrView>(
        query: any,
        options: QueryOptions<T>,
        schema: TableSchema
    ): any {
        if (options.filters) {
            for (const [key, value] of Object.entries(options.filters)) {
                const dbField = schema.fields[key as keyof typeof schema.fields]?.alts.database;
                if (dbField) {
                    query = query.eq(dbField, value);
                }
            }
        }

        if (options.sorts) {
            for (const sort of options.sorts) {
                const dbField = schema.fields[sort.column as keyof typeof schema.fields]?.alts.database;
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
            const dbColumns = options.columns.map(col => schema.fields[col]?.alts.database).filter(Boolean);
            query = query.select(dbColumns.join(', '));
        }

        return query;
    }

    private convertResponse<T extends TableOrView>(data: any, name: T): any {
        return convertData(data, 'database', 'frontend', name);
    }

    async fetchOne<T extends TableOrView>(
        name: T,
        id: string,
        options: Omit<QueryOptions<T>, 'limit' | 'offset'> = {}
    ): Promise<any> {
        const dbName = this.getDatabaseTableName(name);
        const schema = getSchema(name, 'database')!;

        let query = this.client.from(dbName).select('*').eq('id', id);
        query = this.applyQueryOptions(query, options, schema);

        const { data, error } = await query.single();

        if (error) throw error;
        return this.convertResponse(data, name);
    }

    async fetchAll<T extends TableOrView>(
        name: T,
        options: Omit<QueryOptions<T>, 'limit' | 'offset'> = {}
    ): Promise<any[]> {
        const dbName = this.getDatabaseTableName(name);
        const schema = getSchema(name, 'database')!;

        let query = this.client.from(dbName).select('*');
        query = this.applyQueryOptions(query, options, schema);

        const { data, error } = await query;

        if (error) throw error;
        return data.map(item => this.convertResponse(item, name));
    }

    async fetchPaginated<T extends TableOrView>(
        name: T,
        options: QueryOptions<T>
    ): Promise<{ data: any[]; count: number }> {
        const dbName = this.getDatabaseTableName(name);
        const schema = getSchema(name, 'database')!;

        let query = this.client.from(dbName).select('*', { count: 'exact' });
        query = this.applyQueryOptions(query, options, schema);

        const { data, error, count } = await query;

        if (error) throw error;
        return {
            data: data.map(item => this.convertResponse(item, name)),
            count: count ?? 0,
        };
    }

    async create<T extends TableOrView>(name: T, data: Partial<any>): Promise<any> {
        const dbName = this.getDatabaseTableName(name);
        const schema = getSchema(name, 'database')!;
        const dbData = convertData(data, 'frontend', 'database', name);
        console.log("create method....");
        console.log('DB Name', dbName);
        console.log('dbData', dbData);
        const response = processDataForInsert(dbName, dbData);
        const processedData = response.processedData;
        const requiredMethod = response.callMethod;
        console.log('processMethod', requiredMethod);
        console.log('processedData', processedData);

        let result;

        // Delegate to the appropriate handler based on `requiredMethod`
        switch (requiredMethod) {
            case 'simple':
                result = await this.insertSimple(dbName, processedData);
                break;
            case 'fk': // This will handle both one and many FK cases
                result = await this.insertWithFk(dbName, processedData);
                break;
            case 'ifk': // This will handle both one and many IFK cases
                result = await this.insertWithIfk(dbName, processedData);
                break;
            case 'fkAndIfk': // This will handle combinations of FK and IFK (both one or many)
                result = await this.insertWithFkAndIfk(dbName, processedData);
                break;
            default:
                throw new Error('Invalid method for insertion');
        }

        return this.convertResponse(result, name);
    }

    async insertSimple(dbName: string, processedData: any): Promise<any> {
        const { data: result, error } = await this.client.from(dbName).insert(processedData).select().single();
        if (error) throw error;
        return result;
    }

    async insertWithFk(dbName: string, processedData: any): Promise<any> {
        const { data: result, error } = await this.client.from(dbName).insert(processedData).select().single();
        if (error) throw error;
        return result;
    }

    async insertWithIfk(dbName: string, processedData: any): Promise<any> {
        const { data: primaryResult, error: primaryError } = await this.client
            .from(dbName)
            .insert(processedData)
            .select()
            .single();

        if (primaryError) throw primaryError;

        for (const relatedTable of processedData.relatedTables) {
            const relatedInsertData = { ...relatedTable.data, related_column: primaryResult.id };
            const { error: relatedError } = await this.client
                .from(relatedTable.table)
                .insert(relatedInsertData)
                .select()
                .single();

            if (relatedError) throw relatedError;
        }

        return primaryResult;
    }


    async insertWithFkAndIfk(dbName: string, processedData: any): Promise<any> {
        const { data: primaryResult, error: primaryError } = await this.client
            .from(dbName)
            .insert(processedData)
            .select()
            .single();

        if (primaryError) throw primaryError;

        for (const relatedTable of processedData.relatedTables) {
            const relatedInsertData = { ...relatedTable.data, related_column: primaryResult.id };
            const { error: relatedError } = await this.client
                .from(relatedTable.table)
                .insert(relatedInsertData)
                .select()
                .single();

            if (relatedError) throw relatedError;
        }

        return primaryResult;
    }


    async update<T extends TableOrView>(name: T, id: string, data: Partial<any>): Promise<any> {
        const dbName = this.getDatabaseTableName(name);
        const schema = getSchema(name, 'database')!;
        const dbData = convertData(data, 'frontend', 'database', name);

        const { data: result, error } = await this.client
            .from(dbName)
            .update(dbData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.convertResponse(result, name);
    }

    async delete<T extends TableOrView>(name: T, id: string): Promise<void> {
        const dbName = this.getDatabaseTableName(name);
        const schema = getSchema(name, 'database')!;

        if (schema.schemaType === 'view') {
            throw new Error(`Cannot delete from view: ${name}`);
        }

        const { error } = await this.client.from(dbName).delete().eq('id', id);

        if (error) throw error;
    }

    async executeQuery<T extends TableOrView>(
        name: T,
        query: (baseQuery: any) => any
    ): Promise<any[]> {
        const dbName = this.getDatabaseTableName(name);
        const baseQuery = this.client.from(dbName).select('*');
        const customQuery = query(baseQuery);

        const { data, error } = await customQuery;

        if (error) throw error;
        return data.map(item => this.convertResponse(item, name));
    }

    subscribeToChanges<T extends TableOrView>(name: T, callback: SubscriptionCallback): void {
        const dbName = this.getDatabaseTableName(name);
        const schema = getSchema(name, 'database')!;

        // Unsubscribe from existing subscription if any
        this.unsubscribeFromChanges(name);

        const subscription = this.client
            .channel(`public:${dbName}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: dbName }, payload => {
                this.fetchAll(name).then(data => {
                    callback(data);
                }).catch(error => {
                    console.error('Error fetching updated data:', error);
                });
            })
            .subscribe();

        this.subscriptions.set(name, subscription);
    }

    unsubscribeFromChanges(name: TableOrView): void {
        const subscription = this.subscriptions.get(name);
        if (subscription) {
            this.client.removeChannel(subscription);
            this.subscriptions.delete(name);
        }
    }

    unsubscribeFromAllChanges(): void {
        this.subscriptions.forEach((subscription, name) => {
            this.client.removeChannel(subscription);
        });
        this.subscriptions.clear();
    }


    // Helper method to convert any data to frontend format
    convertToFrontendFormat<T extends TableOrView>(name: T, data: any): any {
        if (Array.isArray(data)) {
            return data.map(item => this.convertResponse(item, name));
        } else {
            return this.convertResponse(data, name);
        }
    }

    private async insertSimpleBackup(dbName: string, processedData: any): Promise<any> {
        const { data: result, error } = await this.client.from(dbName).insert(processedData).select().single();
        if (error) throw error;
        return result;
    }

    private async insertOneFkBackup(dbName: string, processedData: any): Promise<any> {
        // Assuming processedData already contains the foreign key value
        const { data: result, error } = await this.client.from(dbName).insert(processedData).select().single();
        if (error) throw error;
        return result;
    }

    private async insertOneIfkBackup(dbName: string, processedData: any): Promise<any> {
        // First insert into the main table
        const { data: primaryResult, error: primaryError } = await this.client
            .from(dbName)
            .insert(processedData)
            .select()
            .single();

        if (primaryError) throw primaryError;

        // Now insert into the related table using primaryResult.id
        const relatedData = { ...processedData.related, related_column: primaryResult.id };
        const { data: relatedResult, error: relatedError } = await this.client
            .from('related_table')
            .insert(relatedData)
            .select()
            .single();

        if (relatedError) throw relatedError;
        return relatedResult;
    }

    private async insertOneFkOneIfkBackup(dbName: string, processedData: any): Promise<any> {
        // Insert into the main table with the foreign key value
        const { data: primaryResult, error: primaryError } = await this.client
            .from(dbName)
            .insert(processedData)
            .select()
            .single();

        if (primaryError) throw primaryError;

        // Use the newly inserted primaryResult.id as the foreign key for the related table
        const relatedData = { ...processedData.related, related_column: primaryResult.id };
        const { data: relatedResult, error: relatedError } = await this.client
            .from('related_table')
            .insert(relatedData)
            .select()
            .single();

        if (relatedError) throw relatedError;
        return relatedResult;
    }

    private async insertManyFkBackup(dbName: string, processedData: any): Promise<any> {
        // Assuming processedData contains all necessary foreign key values
        const { data: result, error } = await this.client.from(dbName).insert(processedData).select().single();
        if (error) throw error;
        return result;
    }

    private async insertManyIfkBackup(dbName: string, processedData: any): Promise<any> {
        // Insert into the main table
        const { data: primaryResult, error: primaryError } = await this.client
            .from(dbName)
            .insert(processedData)
            .select()
            .single();

        if (primaryError) throw primaryError;

        // Loop through inverse FKs and insert into related tables
        for (const relatedData of processedData.relatedTables) {
            const relatedInsertData = { ...relatedData, related_column: primaryResult.id };
            const { error: relatedError } = await this.client
                .from(relatedData.table)
                .insert(relatedInsertData)
                .select()
                .single();

            if (relatedError) throw relatedError;
        }

        return primaryResult;
    }

    private async insertManyFkIfkBackup(dbName: string, processedData: any): Promise<any> {
        // Insert into the main table with the FKs
        const { data: primaryResult, error: primaryError } = await this.client
            .from(dbName)
            .insert(processedData)
            .select()
            .single();

        if (primaryError) throw primaryError;

        // Loop through inverse FKs and insert into related tables
        for (const relatedData of processedData.relatedTables) {
            const relatedInsertData = { ...relatedData, related_column: primaryResult.id };
            const { error: relatedError } = await this.client
                .from(relatedData.table)
                .insert(relatedInsertData)
                .select()
                .single();

            if (relatedError) throw relatedError;
        }

        return primaryResult;
    }
}

export const databaseApi = new DatabaseApiWrapper(supabase);
