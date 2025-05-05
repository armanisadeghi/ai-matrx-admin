import React from 'react';
import { TabsContent, ScrollArea } from "@/components/ui";
import { CopyButton } from "@/components/matrx/buttons/CopyButton";

interface StructuredDataTabProps {
    responses: any; // Can be array or object
    safeStringify: (value: any, indent?: number) => string;
}

const StructuredDataTab = ({ responses, safeStringify }: StructuredDataTabProps) => {
    // Function to determine if responses is empty
    const isEmpty = (data: any) => {
        if (Array.isArray(data)) {
            return data.length === 0;
        } else if (data && typeof data === 'object') {
            return Object.keys(data).length === 0;
        }
        return !data; // Handle null/undefined
    };

    // Function to render response items
    const renderResponses = () => {
        if (Array.isArray(responses)) {
            // Handle array of responses
            return responses.map((response, index) => (
                <div key={index} className="p-2 border rounded bg-gray-50 dark:bg-gray-800">
                    <div className="flex justify-between items-center font-semibold text-xs mb-1 text-gray-600 dark:text-gray-400">
                        <span>Response {index + 1}:</span>
                        <CopyButton content={safeStringify(response)} />
                    </div>
                    <pre className="font-mono text-xs whitespace-pre-wrap">
                        {safeStringify(response)}
                    </pre>
                </div>
            ));
        } else if (responses && typeof responses === 'object') {
            // Handle single object - display each key-value pair
            return Object.entries(responses).map(([key, value], index) => (
                <div key={index} className="p-2 border rounded bg-gray-50 dark:bg-gray-800">
                    <div className="flex justify-between items-center font-semibold text-xs mb-1 text-gray-600 dark:text-gray-400">
                        <span>{key}:</span>
                        <CopyButton content={safeStringify(value)} />
                    </div>
                    <pre className="font-mono text-xs whitespace-pre-wrap">
                        {safeStringify(value)}
                    </pre>
                </div>
            ));
        } else {
            // Handle single primitive value (unlikely, but covered for completeness)
            return (
                <div className="p-2 border rounded bg-gray-50 dark:bg-gray-800">
                    <div className="flex justify-between items-center font-semibold text-xs mb-1 text-gray-600 dark:text-gray-400">
                        <span>Response:</span>
                        <CopyButton content={safeStringify(responses)} />
                    </div>
                    <pre className="font-mono text-xs whitespace-pre-wrap">
                        {safeStringify(responses)}
                    </pre>
                </div>
            );
        }
    };

    return (
        <TabsContent value="structured">
            <ScrollArea className="w-full rounded-md border p-4 h-full">
                {!isEmpty(responses) ? (
                    <div className="space-y-4">
                        {renderResponses()}
                    </div>
                ) : (
                    <div className="text-center p-4 text-gray-500 italic">No structured data received</div>
                )}
            </ScrollArea>
        </TabsContent>
    );
};

export default StructuredDataTab;