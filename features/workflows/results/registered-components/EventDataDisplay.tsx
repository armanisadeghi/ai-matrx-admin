"use client";
import React, { useMemo } from "react";
import { Calendar } from "lucide-react";
import { PageTemplate, Card } from "@/components/official/PageTemplate";
import { useAppSelector } from "@/lib/redux/hooks";
import { brokerSelectors } from "@/lib/redux/brokerSlice";
import { DbFunctionNode } from "@/features/workflows/types";
import SmartDisplay from "./SmartDisplay";

interface EventDataDisplayProps {
    nodeData: DbFunctionNode;
    brokerId?: string;
    keyToDisplay?: string;
}

const testBrokerId = "e3312084-c6c2-41f8-85b1-f4ef198854ac";

const EventDataDisplay: React.FC<EventDataDisplayProps> = ({ nodeData, brokerId, keyToDisplay }) => {
    if (!brokerId) {
        brokerId = nodeData.return_broker_overrides[0];
    }

    const data = useAppSelector((state) => brokerSelectors.selectValue(state, brokerId));
    
    const dataToUse = useMemo(() => {
        if (!keyToDisplay) {
            return data;
        }
        return data?.[keyToDisplay];
    }, [data, keyToDisplay]);

    // Validation: Check if data structure is what we expect for EventDataDisplay
    const isValidEventData = useMemo(() => {
        if (!dataToUse) return false;
        
        // Check if it has the expected structure with string data
        if (typeof dataToUse.data !== 'string') return false;
        if (typeof dataToUse.success !== 'boolean') return false;
        if (typeof dataToUse.execution_time_ms !== 'number') return false;
        
        return true;
    }, [dataToUse]);

    // If data structure is not what we expect, fall back to SmartDisplay
    if (!dataToUse || !isValidEventData) {
        return (
            <div className="space-y-3">
                <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    EventDataDisplay could not display the content. Using Smart Display
                </div>
                <SmartDisplay nodeData={nodeData} brokerId={brokerId} keyToDisplay={keyToDisplay} />
            </div>
        );
    }

    const statsItems = [
        { label: "Status", value: dataToUse?.success ? "Success" : "Failed" },
        { label: "Execution Time", value: `${dataToUse?.execution_time_ms}ms` },
        { label: "Has Errors", value: dataToUse?.errors ? "Yes" : "No" },
    ];

    // Raw content component
    const RawContentTab = () => (
        <Card title="Raw Event Data">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border-border">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed">{dataToUse?.data}</pre>
            </div>
        </Card>
    );

    // Metadata component
    const MetadataTab = () => (
        <Card title="Response Metadata">
            <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Success:</span>
                            <span
                                className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                                    dataToUse?.success
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                }`}
                            >
                                {dataToUse?.success ? "True" : "False"}
                            </span>
                        </div>
                        <div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Execution Time:</span>
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{dataToUse?.execution_time_ms}ms</span>
                        </div>
                        <div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Errors:</span>
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                {dataToUse?.errors ? JSON.stringify(dataToUse?.errors) : "None"}
                            </span>
                        </div>
                        <div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Content Length:</span>
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                {dataToUse?.data?.length?.toLocaleString()} characters
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );

    // Define the tabs
    const tabs = [
        {
            id: "content",
            label: "Raw Content",
            icon: Calendar,
            content: <RawContentTab />,
        },
        {
            id: "metadata",
            label: "Metadata",
            icon: Calendar,
            content: <MetadataTab />,
        },
    ];

    return (
        <PageTemplate
            title="Event Data Display"
            subtitle="Raw content display preserving original formatting"
            statsItems={statsItems}
            tabs={tabs}
            defaultActiveTab="content"
            heroSize="s"
        />
    );
};

export default React.memo(EventDataDisplay);
