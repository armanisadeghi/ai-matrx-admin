import React, {Suspense, useState} from "react";
// import useDatabase from "@/lib/hooks/useDatabase";
import SchemaSelect from "@/components/matrx/schema/ops/SchemaSelect";
import {Button} from "@/components/ui";
import {MatrxTableLoading} from "@/components/matrx/LoadingComponents";
import MatrxTable from "@/app/(authenticated)/tests/matrx-table/components/MatrxTable";

const RealtimeSubscription = () => {
    const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
    const [subscribed, setSubscribed] = useState(false);
    // const {data, subscribeToChanges, unsubscribeFromChanges} = useDatabase();

    const handleToggleSubscription = () => {
        if (selectedSchema) {
            if (subscribed) {
                // @ts-ignore - unsubscribeFromChanges function not available (import commented out)
                unsubscribeFromChanges(selectedSchema);
                setSubscribed(false);
            } else {
                // @ts-ignore - subscribeToChanges function not available (import commented out)
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
            {/* @ts-ignore - data variable not available (import commented out) */}
            {subscribed && data && (
                <Suspense fallback={<MatrxTableLoading/>}>
                    {/* @ts-ignore - data variable not available (import commented out) */}
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

export default RealtimeSubscription;
