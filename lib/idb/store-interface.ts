// lib/idb/store-interface.ts

import { DBStoreManager, AsyncResult } from './store-manager';

export abstract class PublicStoreManager<T> extends DBStoreManager<T> {
    constructor(dbName: string, version: number) {
        super(dbName, version);
    }

    public async addItem(storeName: string, data: T): AsyncResult<string> {
        return this.add(storeName, data);
    }

    public async getItem(storeName: string, id: string): AsyncResult<T> {
        return this.get(storeName, id);
    }

    public async getAllItems(storeName: string): AsyncResult<T[]> {
        return this.getAll(storeName);
    }

    public async updateItem<T extends object>(
        storeName: string,
        id: number,
        data: Partial<T>
    ): Promise<AsyncResult<boolean>> {
        return this.update(storeName, id, data);
    }

    public async deleteItem(storeName: string, id: number): Promise<AsyncResult<boolean>> {
        return this.delete(storeName, id);
    }

    public async queryItems<T>(
        storeName: string,
        indexName: string,
        query: IDBValidKey | IDBKeyRange
    ): Promise<AsyncResult<T[]>> {
        return this.query(storeName, indexName, query);
    }
}
