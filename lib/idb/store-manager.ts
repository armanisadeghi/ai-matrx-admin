// lib/idb/store-manager.ts

import { openDB, IDBPDatabase } from 'idb';

export type AsyncResult<T> = Promise<{ data: T | null; error: Error | null }>;

export abstract class DBStoreManager<T> {
    protected static _instance: any;
    protected db: IDBPDatabase | null = null;
    protected dbName: string;
    protected version: number;

    protected constructor(dbName: string, version: number) {
        this.dbName = dbName;
        this.version = version;
    }

    protected abstract setupStores(db: IDBPDatabase): void;

    protected async initDB(): Promise<void> {
        if (this.db) return;

        try {
            this.db = await openDB(this.dbName, this.version, {
                upgrade: (db, oldVersion, newVersion) => {
                    this.setupStores(db);
                },
            });
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    protected async add(storeName: string, data: T): AsyncResult<string> {
        try {
            if (!this.db) throw new Error('Database not initialized');
            const id = await this.db.add(storeName, data);
            return { data: id.toString(), error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    }

    protected async get(storeName: string, id: string): AsyncResult<T> {
        try {
            if (!this.db) throw new Error('Database not initialized');
            const result = await this.db.get(storeName, id);
            return { data: result as T, error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    }

    protected async getAll(storeName: string): AsyncResult<T[]> {
        try {
            if (!this.db) throw new Error('Database not initialized');
            const result = await this.db.getAll(storeName);
            return { data: result as T[], error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    }

    protected async update<T extends object>(storeName: string, id: number, data: Partial<T>): AsyncResult<boolean> {
        try {
            if (!this.db) throw new Error('Database not initialized');
            const existing = await this.db.get(storeName, id);
            if (!existing) throw new Error('Record not found');

            const updated = { ...existing, ...data };
            await this.db.put(storeName, updated);
            return { data: true, error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    }

    protected async delete(storeName: string, id: number): AsyncResult<boolean> {
        try {
            if (!this.db) throw new Error('Database not initialized');
            await this.db.delete(storeName, id);
            return { data: true, error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    }

    protected async query<T>(
        storeName: string,
        indexName: string,
        query: IDBValidKey | IDBKeyRange
    ): AsyncResult<T[]> {
        try {
            if (!this.db) throw new Error('Database not initialized');
            const result = await this.db.getAllFromIndex(storeName, indexName, query);
            return { data: result as T[], error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    }
}