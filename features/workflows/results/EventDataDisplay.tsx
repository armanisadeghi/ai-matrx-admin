"use client";
import React, { useMemo } from "react";
import { Calendar } from "lucide-react";
import { PageTemplate, Card } from "@/features/scraper/parts/reusable/PageTemplate";
import { useAppSelector } from "@/lib/redux/hooks";
import { brokerSelectors } from "@/lib/redux/brokerSlice";

interface EventDataDisplayProps {
    data: {
        success: boolean;
        data: string;
        errors: any;
        execution_time_ms: number;
    };
}

const EventDataDisplay: React.FC<EventDataDisplayProps> = ({ data }) => {
    const dataToUse = useAppSelector((state) => brokerSelectors.selectValue(state, "e3312084-c6c2-41f8-85b1-f4ef198854ac"));

    if (!dataToUse) {
        return <div>No data</div>;
    }

    const statsItems = [
        { label: "Status", value: dataToUse?.success ? "Success" : "Failed" },
        { label: "Execution Time", value: `${dataToUse?.execution_time_ms}ms` },
        { label: "Has Errors", value: dataToUse?.errors ? "Yes" : "No" },
    ];

    // Raw content component
    const RawContentTab = () => (
        <Card title="Raw Event Data">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed">{dataToUse?.data}</pre>
            </div>
        </Card>
    );

    // Metadata component
    const MetadataTab = () => (
        <Card title="Response Metadata">
            <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
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
