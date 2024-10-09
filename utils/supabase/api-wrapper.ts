import { SupabaseClient } from '@supabase/supabase-js';
import { convertData, getSchema, TableSchema, getRegisteredSchemas } from "@/utils/schema/schemaRegistry";
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

        const { data: result, error } = await this.client.from(dbName).insert(dbData).select().single();

        if (error) throw error;
        return this.convertResponse(result, name);
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
}

export const databaseApi = new DatabaseApiWrapper(supabase);
