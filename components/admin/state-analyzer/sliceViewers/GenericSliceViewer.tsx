// sliceViewers/GenericSliceViewer.jsx
import React from "react";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import JsonTree from "@/components/admin/state-analyzer/components/JsonTree";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatJson } from "@/utils/json/json-cleaner-utility";

const GenericSliceViewer = ({ sliceKey, state }) => {
    return (
        <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">{sliceKey} State</h2>

            <Tabs defaultValue="json">
                <TabsList className="mb-4">
                    <TabsTrigger value="json">JSON</TabsTrigger>
                    <TabsTrigger value="raw">JSON Explorer</TabsTrigger>
                    <TabsTrigger value="tree">Tree View</TabsTrigger>
                </TabsList>
                <TabsContent value="json" className="bg-gray-50 dark:bg-zinc-900 p-4 rounded-lg overflow-auto max-h-full">
                    <pre className="w-full h-full overflow-auto text-gray-800 dark:text-gray-300">{formatJson(state, 2)}</pre>
                </TabsContent>

                <TabsContent value="raw" className="bg-gray-50 dark:bg-zinc-900 p-4 rounded-lg overflow-auto max-h-full">
                    <RawJsonExplorer pageData={state} />
                </TabsContent>
                <TabsContent value="tree" className="bg-gray-50 dark:bg-zinc-900 p-4 rounded-lg overflow-auto max-h-full">
                    <JsonTree data={state} />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default GenericSliceViewer;
