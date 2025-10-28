// sliceViewers/AppletRuntimeViewer.jsx

import React from "react";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import JsonTree from "@/components/admin/state-analyzer/components/JsonTree";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatJson } from "@/utils/json/json-cleaner-utility";

const AppletRuntimeViewer = ({ sliceKey, state }) => {
    const applets = state?.applets || {};
    const appletIds = Object.keys(applets);

    return (
        <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg">
            <Tabs defaultValue="json">
                <TabsList className="mb-4 flex flex-col gap-2 h-26">
                    {/* First row: View type tabs */}
                    <div className="flex flex-wrap gap-1">
                        <TabsTrigger value="json">Full JSON</TabsTrigger>
                        <TabsTrigger value="raw">Full JSON Explorer</TabsTrigger>
                        <TabsTrigger value="tree">Full Tree View</TabsTrigger>
                    </div>

                    {/* Second row: Applet tabs */}
                    <div className="flex flex-wrap gap-1">
                        {appletIds.map((id) => (
                            <TabsTrigger key={id} value={`applet-${id}`} className="text-xs">
                                {applets[id]?.name || id}
                            </TabsTrigger>
                        ))}
                    </div>

                    {/* Third row: Container tabs */}
                    <div className="flex flex-wrap gap-1">
                        {appletIds.map((appletId) => {
                            const applet = applets[appletId];
                            const containers = applet?.containers || [];
                            return containers.map((container) => (
                                <TabsTrigger
                                    key={`${appletId}-container-${container.id}`}
                                    value={`container-${appletId}-${container.id}`}
                                    className="text-xs"
                                >
                                    {`${container.label}`}
                                </TabsTrigger>
                            ));
                        })}
                    </div>

                    {/* Fourth row: Fields tabs */}
                    <div className="flex flex-wrap gap-1">
                        {appletIds.map((appletId) => {
                            const applet = applets[appletId];
                            const containers = applet?.containers || [];
                            return containers.flatMap((container) => {
                                const fields = container?.fields || [];
                                return fields.map((field) => (
                                    <TabsTrigger
                                        key={`field-${appletId}-${container.id}-${field.id}`}
                                        value={`field-${appletId}-${container.id}-${field.id}`}
                                        className="text-xs"
                                    >
                                        {field.label}
                                    </TabsTrigger>
                                ));
                            });
                        })}
                    </div>
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

                {/* Dynamically generate tab content for each applet */}
                {appletIds.map((id) => {
                    const applet = {...applets[id]};
                    // Replace containers with a list of their labels
                    if (applet.containers) {
                        applet.containers = applet.containers.map(container => container.label);
                    }
                    
                    return (
                        <TabsContent
                            key={id}
                            value={`applet-${id}`}
                            className="bg-gray-50 dark:bg-zinc-900 p-4 rounded-lg overflow-auto max-h-full"
                        >
                            <RawJsonExplorer pageData={applet} />
                        </TabsContent>
                    );
                })}

                {/* Dynamically generate tab content for each container within applets */}
                {appletIds.map((appletId) => {
                    const applet = applets[appletId];
                    const containers = applet?.containers || [];

                    return containers.map((container) => {
                        // Create a copy of the container to modify
                        const containerCopy = {...container};
                        // Replace fields with a list of their labels
                        if (containerCopy.fields) {
                            containerCopy.fields = containerCopy.fields.map(field => field.label);
                        }
                        
                        return (
                            <TabsContent
                                key={`${appletId}-container-${container.id}`}
                                value={`container-${appletId}-${container.id}`}
                                className="bg-gray-50 dark:bg-zinc-900 p-4 rounded-lg overflow-auto max-h-full"
                            >
                                <RawJsonExplorer pageData={containerCopy} />
                            </TabsContent>
                        );
                    });
                })}

                {/* Dynamically generate tab content for each field within containers */}
                {appletIds.map((appletId) => {
                    const applet = applets[appletId];
                    const containers = applet?.containers || [];

                    return containers.flatMap((container) => {
                        const fields = container?.fields || [];
                        return fields.map((field) => (
                            <TabsContent
                                key={`field-${appletId}-${container.id}-${field.id}`}
                                value={`field-${appletId}-${container.id}-${field.id}`}
                                className="bg-gray-50 dark:bg-zinc-900 p-4 rounded-lg overflow-auto max-h-full"
                            >
                                <RawJsonExplorer pageData={field} />
                            </TabsContent>
                        ));
                    });
                })}
            </Tabs>
        </div>
    );
};

export default AppletRuntimeViewer;
