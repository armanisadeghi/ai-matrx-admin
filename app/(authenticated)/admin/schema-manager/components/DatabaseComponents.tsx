'use client';

import React, {useState, useEffect, Suspense} from 'react';
import {Button, Input} from '@/components/ui';
import useDatabase from '@/lib/hooks/useDatabase';
import {MatrxTableLoading} from '@/components/matrx/LoadingComponents';
import MatrxTable from "@/app/(authenticated)/tests/matrx-table/components/MatrxTable";
import SchemaSelect from "@/app/(authenticated)/admin/schema-manager/components/SchemaSelect";


const FetchOperations = () => {
    const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
    const [id, setId] = useState('');
    const {data, loading, error, fetchOne, fetchAll} = useDatabase();

    const handleFetchOne = () => {
        if (selectedSchema && id) {
            fetchOne(selectedSchema, id);
        }
    };

    const handleFetchAll = () => {
        if (selectedSchema) {
            fetchAll(selectedSchema);
        }
    };

    return (
        <div className="space-y-4">
            <SchemaSelect onSchemaSelect={setSelectedSchema} selectedSchema={selectedSchema}/>
            <Input
                placeholder="ID (for fetchOne)"
                value={id}
                onChange={(e) => setId(e.target.value)}
            />
            <div className="space-x-2">
                <Button onClick={handleFetchOne} disabled={!selectedSchema || !id}>Fetch One</Button>
                <Button onClick={handleFetchAll} disabled={!selectedSchema}>Fetch All</Button>
            </div>
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">Error: {error.message}</p>}
            {data && (
                <Suspense fallback={<MatrxTableLoading/>}>
                    <MatrxTable
                        data={data}
                        actions={['view']}
                        onAction={(actionName, rowData) => console.log(actionName, rowData)}
                        truncateAt={50}
                        customModalContent={(rowData) => (
                            <pre>{JSON.stringify(rowData, null, 2)}</pre>
                        )}
                    />
                </Suspense>
            )}
        </div>
    );
};


// CreateOperation Component
const CreateOperation = () => {
    const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
    const [newData, setNewData] = useState('');
    const {create, loading, error} = useDatabase();

    const handleCreate = () => {
        if (selectedSchema) {
            try {
                const parsedData = JSON.parse(newData);
                create(selectedSchema, parsedData);
            } catch (e) {
                console.error('Invalid JSON', e);
            }
        }
    };

    return (
        <div className="space-y-4">
            <SchemaSelect onSchemaSelect={setSelectedSchema} selectedSchema={selectedSchema}/>
            <textarea
                className="w-full p-2 border rounded"
                placeholder="New Data (JSON format)"
                value={newData}
                onChange={(e) => setNewData(e.target.value)}
            />
            <Button onClick={handleCreate} disabled={loading || !selectedSchema}>
                Create
            </Button>
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">Error: {error.message}</p>}
        </div>
    );
};

// UpdateOperation Component
const UpdateOperation = () => {
    const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
    const [id, setId] = useState('');
    const [updateData, setUpdateData] = useState('');
    const {update, loading, error} = useDatabase();

    const handleUpdate = () => {
        if (selectedSchema && id) {
            try {
                const parsedData = JSON.parse(updateData);
                update(selectedSchema, id, parsedData);
            } catch (e) {
                console.error('Invalid JSON', e);
            }
        }
    };

    return (
        <div className="space-y-4">
            <SchemaSelect onSchemaSelect={setSelectedSchema} selectedSchema={selectedSchema}/>
            <Input
                placeholder="ID"
                value={id}
                onChange={(e) => setId(e.target.value)}
            />
            <textarea
                className="w-full p-2 border rounded"
                placeholder="Update Data (JSON format)"
                value={updateData}
                onChange={(e) => setUpdateData(e.target.value)}
            />
            <Button onClick={handleUpdate} disabled={loading || !selectedSchema || !id}>
                Update
            </Button>
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">Error: {error.message}</p>}
        </div>
    );
};

// DeleteOperation Component
const DeleteOperation = () => {
    const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
    const {data, loading, error, delete: deleteRecord, fetchAll} = useDatabase();

    useEffect(() => {
        if (selectedSchema) {
            fetchAll(selectedSchema);
        }
    }, [selectedSchema, fetchAll]);

    const handleDelete = (id: string) => {
        if (selectedSchema) {
            deleteRecord(selectedSchema, id);
        }
    };

    return (
        <div className="space-y-4">
            <SchemaSelect onSchemaSelect={setSelectedSchema} selectedSchema={selectedSchema}/>
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">Error: {error.message}</p>}
            {data && (
                <Suspense fallback={<MatrxTableLoading/>}>
                    <MatrxTable
                        data={data}
                        actions={['delete']}
                        onAction={(actionName, rowData) => {
                            if (actionName === 'delete') {
                                handleDelete(rowData.id);
                            }
                        }}
                        truncateAt={50}
                    />
                </Suspense>
            )}
        </div>
    );
};


// PaginatedFetch Component
const PaginatedFetch = () => {
    const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
    const {data, loading, error, fetchPaginated} = useDatabase();

    const handlePageChange = (page: number, pageSize: number) => {
        if (selectedSchema) {
            fetchPaginated(selectedSchema, {limit: pageSize, offset: (page - 1) * pageSize});
        }
    };

    useEffect(() => {
        if (selectedSchema) {
            handlePageChange(1, 10); // Initial fetch
        }
    }, [selectedSchema]);

    return (
        <div className="space-y-4">
            <SchemaSelect onSchemaSelect={setSelectedSchema} selectedSchema={selectedSchema}/>
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">Error: {error.message}</p>}
            {data && (
                <Suspense fallback={<MatrxTableLoading/>}>
                    <MatrxTable
                        data={data}
                        actions={['view']}
                        onAction={(actionName, rowData) => console.log(actionName, rowData)}
                        truncateAt={50}
                        customModalContent={(rowData) => (
                            <pre>{JSON.stringify(rowData, null, 2)}</pre>
                        )}
                        onPageChange={handlePageChange}
                    />
                </Suspense>
            )}
        </div>
    );
};


// CustomQuery Component
const CustomQuery = () => {
    const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const {data, loading, error, executeQuery} = useDatabase();

    const handleExecuteQuery = () => {
        if (selectedSchema) {
            executeQuery(selectedSchema, (baseQuery) => {
                // This is a simple example. In a real application, you'd want to validate and sanitize this input.
                return eval(`baseQuery.${query}`);
            });
        }
    };

    return (
        <div className="space-y-4">
            <SchemaSelect onSchemaSelect={setSelectedSchema} selectedSchema={selectedSchema}/>
            <textarea
                className="w-full p-2 border rounded"
                placeholder="Query (e.g., 'where('column', 'value')')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <Button onClick={handleExecuteQuery} disabled={loading || !selectedSchema}>
                Execute Query
            </Button>
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">Error: {error.message}</p>}
            {data && (
                <Suspense fallback={<MatrxTableLoading/>}>
                    <MatrxTable
                        data={data}
                        actions={['view']}
                        onAction={(actionName, rowData) => console.log(actionName, rowData)}
                        truncateAt={50}
                        customModalContent={(rowData) => (
                            <pre>{JSON.stringify(rowData, null, 2)}</pre>
                        )}
                    />
                </Suspense>
            )}
        </div>
    );
};


// RealtimeSubscription Component
const RealtimeSubscription = () => {
    const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
    const [subscribed, setSubscribed] = useState(false);
    const {data, subscribeToChanges, unsubscribeFromChanges} = useDatabase();

    const handleToggleSubscription = () => {
        if (selectedSchema) {
            if (subscribed) {
                unsubscribeFromChanges(selectedSchema);
                setSubscribed(false);
            } else {
                subscribeToChanges(selectedSchema);
                setSubscribed(true);
            }
        }
    };

    return (
        <div className="space-y-4">
            <SchemaSelect onSchemaSelect={setSelectedSchema} selectedSchema={selectedSchema}/>
            <Button onClick={handleToggleSubscription} disabled={!selectedSchema}>
                {subscribed ? 'Unsubscribe' : 'Subscribe'}
            </Button>
            {subscribed && data && (
                <Suspense fallback={<MatrxTableLoading/>}>
                    <MatrxTable
                        data={data}
                        actions={['view']}
                        onAction={(actionName, rowData) => console.log(actionName, rowData)}
                        truncateAt={50}
                        customModalContent={(rowData) => (
                            <pre>{JSON.stringify(rowData, null, 2)}</pre>
                        )}
                    />
                </Suspense>
            )}
        </div>
    );
};

export {
    FetchOperations,
    CreateOperation,
    UpdateOperation,
    DeleteOperation,
    PaginatedFetch,
    CustomQuery,
    RealtimeSubscription
};
