// app/(authenticated)/tests/schema/components/SchemaInteractions.tsx

'use client';

import * as React from 'react';
import useDatabase from "@/lib/hooks/useDatabase";
import {MediumComponentLoading} from "@/components/matrx/LoadingComponents";


function SchemaInteractions() {
    const {data, loading, error, fetchAll, create} = useDatabase();

    React.useEffect(() => {
        fetchAll('systemFunction');
    }, [fetchAll]);

    const handleCreate = async () => {
        await create('systemFunction', {name: 'New Function'});
    };

    if (loading) return <MediumComponentLoading/>;
    if (error) return <p>Error: {error.message}</p>;

    return (
        <div>
            <ul>
                {data?.map(item => (
                    <li key={item.id}>{item.name}</li>
                ))}
            </ul>
            <button onClick={handleCreate}>Create New Function</button>
        </div>
    );
}

export default SchemaInteractions;
