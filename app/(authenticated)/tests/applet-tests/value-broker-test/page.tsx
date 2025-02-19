"use client";

import { useValueBroker } from "@/components/brokers/hooks/useValueBroker";
import MatrxDynamicPanel from "@/components/matrx/resizable/MatrxDynamicPanel";
import EnhancedEntityAnalyzer from "@/components/admin/redux/EnhancedEntityAnalyzer";
import { useGetOrFetchRecord } from "@/app/entities/hooks/records/useGetOrFetch";

export default function ValueBrokerTestPage() {
    const brokerId = "008cd2f3-a5bc-4856-9b64-e77b4e40d6c7";

    const broker = useGetOrFetchRecord({ entityName: "dataBroker", simpleId: brokerId });

    const { currentValue, setValue } = useValueBroker(brokerId);

    return (
        <>
            <div className="container mx-auto p-8 dark:bg-gray-800 dark:text-white">
                <h1 className="text-2xl font-bold mb-8">Value Broker Test</h1>

                <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">Broker Info</h2>
                    <div className="mb-1">Broker ID: {brokerId}</div>
                    <div className="mb-4">
                        Current Value:{" "}
                        <code className="inline bg-gray-100 p-1 rounded dark:bg-gray-700">{JSON.stringify(currentValue, null, 2)}</code>
                    </div>
                </div>

                <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">Update Value</h2>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={currentValue || ""}
                            onChange={(e) => setValue(e.target.value)}
                            className="border p-2 rounded dark:bg-gray-700 dark:border-gray-600"
                            placeholder="Enter new value"
                        />
                    </div>
                </div>

                <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-700 rounded">
                    <h3 className="font-medium mb-2">Debug Info:</h3>
                    <div>
                        <div>Current Value (after conversion): {JSON.stringify(currentValue)}</div>
                        <div>Value Type: {currentValue !== null ? typeof currentValue : "null"}</div>
                    </div>
                </div>
            </div>
            <MatrxDynamicPanel
                initialPosition="left"
                defaultExpanded={false}
                expandButtonProps={{
                    label: "Entity State",
                }}
            >
                <EnhancedEntityAnalyzer defaultExpanded={false} selectedEntityKey="brokerValue" />
            </MatrxDynamicPanel>
        </>
    );
}