import React from 'react';
import { TabsContent, ScrollArea, Label, Input, Textarea, Button } from "@/components/ui";
import { CopyButton } from "@/components/matrx/buttons/CopyButton";

interface PropertiesBrowserTabProps {
    responses: any[];
    selectedObjectIndex: number;
    setSelectedObjectIndex: (index: number) => void;
    selectedObject: any;
    objectProperties: { key: string; path: string; value: any }[];
    displayModes: Record<string, boolean>;
    toggleDisplayMode: (propPath: string) => void;
    safeStringify: (value: any, indent?: number) => string;
}

const PropertiesBrowserTab = ({
    responses,
    selectedObjectIndex,
    setSelectedObjectIndex,
    selectedObject,
    objectProperties,
    displayModes,
    toggleDisplayMode,
    safeStringify
}: PropertiesBrowserTabProps) => {
    return (
        <TabsContent value="propertiesBrowser">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                    <Label className="mr-2 text-xs">Select Object:</Label>
                    <select
                        className="px-2 py-1 text-xs border rounded bg-gray-100 dark:bg-gray-700"
                        value={selectedObjectIndex}
                        onChange={(e) => setSelectedObjectIndex(Number(e.target.value))}
                    >
                        {responses.map((_, index) => (
                            <option key={index} value={index}>
                                Response {index + 1}
                            </option>
                        ))}
                    </select>
                </div>
                <CopyButton content={safeStringify(selectedObject)} label="Copy All" />
            </div>
            <ScrollArea className="w-full rounded-md border p-4 h-96">
                {objectProperties.length > 0 ? (
                    <div className="space-y-2">
                        {objectProperties.map((prop, idx) => (
                            <div key={idx} className="flex flex-col mb-2">
                                <div className="flex items-center justify-between mb-1">
                                    <Label className="text-xs font-medium" htmlFor={`prop-${idx}`}>
                                        {prop.path}
                                    </Label>
                                    <div className="flex items-center">
                                        <CopyButton
                                            className="mr-2"
                                            content={
                                                typeof prop.value === "object"
                                                    ? safeStringify(prop.value)
                                                    : String(prop.value)
                                            }
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => toggleDisplayMode(prop.path)}
                                        >
                                            {displayModes[prop.path] ? "Use Input" : "Use Textarea"}
                                        </Button>
                                    </div>
                                </div>
                                <div className="w-full">
                                    {displayModes[prop.path] ? (
                                        <Textarea
                                            id={`prop-${idx}`}
                                            className="text-xs font-mono resize-y h-48"
                                            value={
                                                typeof prop.value === "object"
                                                    ? safeStringify(prop.value)
                                                    : String(prop.value)
                                            }
                                            readOnly
                                        />
                                    ) : (
                                        <Input
                                            id={`prop-${idx}`}
                                            className="text-xs h-8 font-mono"
                                            value={
                                                typeof prop.value === "object"
                                                    ? safeStringify(prop.value)
                                                    : String(prop.value)
                                            }
                                            readOnly
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-4 text-gray-500 italic">No properties to display</div>
                )}
            </ScrollArea>
        </TabsContent>
    );
};

export default PropertiesBrowserTab;