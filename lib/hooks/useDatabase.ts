// File: hooks/useDatabase.ts

import { useState, useCallback, useEffect } from 'react';
import { QueryOptions, databaseApi, TableOrView } from "@/utils/supabase/api-wrapper";
import { TableData } from '@/types/tableTypes';
import { FlexibleId, flexibleIdToString, isValidFlexibleId } from '@/types/FlexibleId';
import {
    getPrettyNameForTable,
    getNonFkFields,
    getForeignKeys,
    getInverseForeignKeys,
    getAllKeys,
    getAllFields,
    generateJsonTemplate,
    ensureId
} from "@/utils/schema/schemaUtils";

interface PaginationInfo {
    currentPage: number;
    totalPages: number;
    totalCount: number;
}

interface useDatabaseResult<T> {
    data: T[] | null;
    loading: boolean;
    error: Error | null;
    paginationInfo: PaginationInfo | null;
    fetchOne: (name: TableOrView, id: string, options?: Omit<QueryOptions<TableOrView>, 'limit' | 'offset'>) => Promise<void>;
    fetchAll: (name: TableOrView, options?: Omit<QueryOptions<TableOrView>, 'limit' | 'offset'>) => Promise<void>;
    fetchFk: (name: TableOrView, id: string, foreignKeys: any) => Promise<void>;
    fetchIfk: (name: TableOrView, id: string, inverseForeignKeys: any) => Promise<void>;
    fetchM2m: (name: TableOrView, id: string, manyToMany: any) => Promise<void>;
    fetchPaginated: (name: TableOrView, options: QueryOptions<TableOrView>) => Promise<void>;
    create: (name: TableOrView, data: Partial<T>) => Promise<void>;
    update: (name: TableOrView, id: string, data: Partial<T>) => Promise<void>;
    delete: (name: TableOrView, id: string | number) => Promise<void>;
    executeCustomQuery: (name: TableOrView, query: (baseQuery: any) => any) => Promise<void>;
    subscribeToChanges: (name: TableOrView) => void;
    unsubscribeFromChanges: (name: TableOrView) => void;
}

function useDatabase<T extends { id: string } = any>(initialTable?: TableOrView): useDatabaseResult<T> & {
    getPrettyNameForTable: typeof getPrettyNameForTable;
    getNonFkFields: typeof getNonFkFields;
    getForeignKeys: typeof getForeignKeys;
    getInverseForeignKeys: typeof getInverseForeignKeys;
    getAllKeys: typeof getAllKeys;
    getAllFields: typeof getAllFields;
    generateJsonTemplate: typeof generateJsonTemplate;
    ensureId: typeof ensureId;
} {
    const [data, setData] = useState<T[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [paginationInfo, setPaginationInfo] = useState<PaginationInfo | null>(null);

    const fetchOne = useCallback(async (name: TableOrView, id: string, options?: Omit<QueryOptions<TableOrView>, 'limit' | 'offset'>) => {
        setLoading(true);
        try {
            const result = await databaseApi.fetchOne(name, id, options);
            setData([result] as T[]);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('An unexpected error occurred'));
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAll = useCallback(async (name: TableOrView, options?: Omit<QueryOptions<TableOrView>, 'limit' | 'offset'>) => {
        setLoading(true);
        try {
            const result = await databaseApi.fetchAll(name, options);
            setData(result as T[]);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('An unexpected error occurred'));
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchFk = useCallback(async (name: TableOrView, id: string, foreignKeys: any) => {
        setLoading(true);
        try {
            const result = await databaseApi.fetchFk(name, id, foreignKeys);
            setData([result] as T[]);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('An unexpected error occurred'));
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchIfk = useCallback(async (name: TableOrView, id: string, inverseForeignKeys: any) => {
        setLoading(true);
        try {
            const result = await databaseApi.fetchIfk(name, id, inverseForeignKeys);
            setData([result] as T[]);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('An unexpected error occurred'));
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchM2m = useCallback(async (name: TableOrView, id: string, manyToMany: any) => {
        setLoading(true);
        try {
            const result = await databaseApi.fetchM2m(name, id, manyToMany);
            setData([result] as T[]);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('An unexpected error occurred'));
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPaginated = useCallback(
        async (name: TableOrView, options: QueryOptions<TableOrView>, page: number = 1, pageSize: number = 10, maxCount: number = 10000) => {
            setLoading(true);

            try {
                // Call the updated fetchPaginated method from the database API
                const { page: currentPage, allNamesAndIds, pageSize: returnedPageSize, totalCount, paginatedData } =
                    await databaseApi.fetchPaginated(name, options, page, pageSize, maxCount);

                // Set the returned data and pagination info in the state
                setData(paginatedData as T[]);
                setPaginationInfo({
                    currentPage: currentPage,
                    totalPages: Math.ceil(totalCount / returnedPageSize),
                    totalCount: totalCount,
                });

                // Optionally, if you want to use `allNamesAndIds` somewhere else in the component, you can set it to a state:
                // setAllNamesAndIds(allNamesAndIds);

            } catch (err) {
                setError(err instanceof Error ? err : new Error('An unexpected error occurred'));
            } finally {
                setLoading(false);
            }
        },
        []
    );

    const create = useCallback(async (name: TableOrView, payload: Partial<T>) => {
        setLoading(true);
        try {
            const result = await databaseApi.create(name, payload);
            setData(prevData => prevData ? [...prevData, result] : [result]);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('An unexpected error occurred'));
        } finally {
            setLoading(false);
        }
    }, []);

    const update = useCallback(async (name: TableOrView, id: string, payload: Partial<T>) => {
        setLoading(true);
        try {
            const result = await databaseApi.update(name, id, payload);
            setData(prevData => prevData?.map(item => item.id === id ? result : item) as T[]);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('An unexpected error occurred'));
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteRecord = useCallback(async (name: TableOrView, id: FlexibleId) => {
        if (!isValidFlexibleId(id)) {
            throw new Error('Invalid ID provided');
        }

        setLoading(true);
        try {
            const stringId = flexibleIdToString(id);
            await databaseApi.delete(name, stringId);
            setData(prevData => prevData?.filter(item => item.id !== id) as T[]);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('An unexpected error occurred'));
        } finally {
            setLoading(false);
        }
    }, []);

    const executeCustomQuery = useCallback(async (name: TableOrView, queryFn: (baseQuery: any) => any) => {
        setLoading(true);
        try {
            const result = await databaseApi.executeCustomQuery(name, queryFn);
            setData(result as T[]);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('An unexpected error occurred'));
        } finally {
            setLoading(false);
        }
    }, []);

    const subscribeToChanges = useCallback((name: TableOrView) => {
        databaseApi.subscribeToChanges(name, (newData) => {
            setData(newData as T[]);
        });
    }, []);

    const unsubscribeFromChanges = useCallback((name: TableOrView) => {
        databaseApi.unsubscribeFromChanges(name);
    }, []);

    useEffect(() => {
        if (initialTable) {
            fetchAll(initialTable);
            subscribeToChanges(initialTable);
        }
        return () => {
            if (initialTable) {
                unsubscribeFromChanges(initialTable);
            }
        };
    }, [initialTable, fetchAll, subscribeToChanges, unsubscribeFromChanges]);


    return {
        data,
        loading,
        error,
        paginationInfo,
        fetchOne,
        fetchAll,
        fetchFk,
        fetchIfk,
        fetchM2m,
        fetchPaginated,
        create,
        update,
        delete: deleteRecord,
        executeCustomQuery,
        subscribeToChanges,
        unsubscribeFromChanges,
        // Schema utilities
        getPrettyNameForTable,
        getNonFkFields,
        getForeignKeys,
        getInverseForeignKeys,
        getAllKeys,
        getAllFields,
        generateJsonTemplate,
        ensureId
    };
}

export default useDatabase;
