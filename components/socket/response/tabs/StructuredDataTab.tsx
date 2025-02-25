import React from 'react';
import { TabsContent, ScrollArea } from "@/components/ui";
import { CopyButton } from "@/components/matrx/buttons/CopyButton";

interface StructuredDataTabProps {
    responses: any[];
    safeStringify: (value: any, indent?: number) => string;
}

const StructuredDataTab = ({ responses, safeStringify }: StructuredDataTabProps) => {
    return (
        <TabsContent value="structured">
            <ScrollArea className="w-full rounded-md border p-4 h-96">
                {responses.length > 0 ? (
                    <div className="space-y-4">
                        {responses.map((response, index) => (
                            <div key={index} className="p-2 border rounded bg-gray-50 dark:bg-gray-800">
                                <div className="flex justify-between items-center font-semibold text-xs mb-1 text-gray-600 dark:text-gray-400">
                                    <span>Response {index + 1}:</span>
                                    <CopyButton content={safeStringify(response)} />
                                </div>
                                <pre className="font-mono text-xs whitespace-pre-wrap">
                                    {safeStringify(response)}
                                </pre>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-4 text-gray-500 italic">No structured data received</div>
                )}
            </ScrollArea>
        </TabsContent>
    );
};

export default StructuredDataTab;