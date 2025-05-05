import React, { useEffect } from 'react';
import { TabsContent, ScrollArea, Label, Input, Textarea, Button } from "@/components/ui";
import { CopyButton } from "@/components/matrx/buttons/CopyButton";

interface PropertiesBrowserTabProps {
    responses: any; // Updated to accept any type
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
    // Function to determine if a response should use textarea by default
    const shouldUseTextarea = (value: any): boolean => {
        if (value === null || value === undefined) return false;
        
        let stringValue: string;
        if (typeof value === 'object') {
            stringValue = safeStringify(value);
        } else {
            stringValue = String(value);
        }
        
        // Use textarea if content exceeds 100 characters
        return stringValue.length > 100;
    };
    
    // Set initial display modes based on character count when properties change
    useEffect(() => {
        objectProperties.forEach(prop => {
            // Only set mode if it hasn't been manually set by user
            if (displayModes[prop.path] === undefined) {
                const useTextarea = shouldUseTextarea(prop.value);
                if (useTextarea) {
                    toggleDisplayMode(prop.path);
                }
            }
        });
    }, [objectProperties, displayModes, toggleDisplayMode]);

    // Function to convert non-array responses to array format for compatibility
    const getResponsesArray = () => {
        if (Array.isArray(responses)) {
            return responses;
        } else if (responses && typeof responses === 'object') {
            // Convert object to array format with entries
            return Object.entries(responses).map(([key, value]) => ({
                key,
                value
            }));
        } else if (responses) {
            // Handle primitive value
            return [responses];
        }
        return [];
    };

    // Convert responses to array format for rendering
    const responsesArray = getResponsesArray();
    
    // Determine if we should show the selector dropdown
    const showSelector = responsesArray.length > 1;
    
    // Generate labels for the dropdown options based on response type
    const getOptionLabel = (index: number) => {
        if (Array.isArray(responses)) {
            return `Response ${index + 1}`;
        } else if (responses && typeof responses === 'object') {
            // For objects, use the key as the label
            const keys = Object.keys(responses);
            if (index < keys.length) {
                return keys[index];
            }
        }
        return `Item ${index + 1}`;
    };

    return (
        <TabsContent value="propertiesBrowser">
            <div className="flex justify-between items-center mb-2">
                {showSelector && (
                    <div className="flex items-center">
                        <Label className="mr-2 text-xs">Select Item:</Label>
                        <select
                            className="px-2 py-1 text-xs border rounded bg-gray-100 dark:bg-gray-700"
                            value={selectedObjectIndex}
                            onChange={(e) => setSelectedObjectIndex(Number(e.target.value))}
                        >
                            {responsesArray.map((_, index) => (
                                <option key={index} value={index}>
                                    {getOptionLabel(index)}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                {!showSelector && <div />} {/* Empty div to maintain flex layout */}
                <CopyButton content={safeStringify(selectedObject)} label="Copy All" />
            </div>
            <ScrollArea className="w-full rounded-md border p-4 h-full">
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