// lib/idb/store-interface.ts

import { DBStoreManager, AsyncResult } from './store-manager';

export abstract class PublicStoreManager<T> extends DBStoreManager<T> {
    constructor(dbName: string, version: number) {
        super(dbName, version);
    }

    public addItem(storeName: string, data: T): AsyncResult<string> {
        return this.add(storeName, data);
    }

    public getItem(storeName: string, id: string): AsyncResult<T> {
        return this.get(storeName, id);
    }

    public getAllItems(storeName: string): AsyncResult<T[]> {
        return this.getAll(storeName);
    }

    public updateItem<U extends object>(
        storeName: string,
        id: number,
        data: Partial<U>
    ): AsyncResult<boolean> {
        return this.update<U>(storeName, id, data);
    }

    public deleteItem(storeName: string, id: number): AsyncResult<boolean> {
        return this.delete(storeName, id);
    }

    public queryItems<U>(
        storeName: string,
        indexName: string,
        query: IDBValidKey | IDBKeyRange
    ): AsyncResult<U[]> {
        return this.query<U>(storeName, indexName, query);
    }
}
