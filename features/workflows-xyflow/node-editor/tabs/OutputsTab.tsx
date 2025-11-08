"use client";

import React, { useState } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { workflowNodesActions } from "@/lib/redux/workflow-nodes/slice";
import { Button } from "@/components/ui/ButtonMine";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { DefaultTabProps } from "./types";
import { Output, Relay, Bookmark } from "@/lib/redux/workflow/types";
import { SectionContainer } from "@/features/workflows-xyflow/common";

const DATA_TYPES = [
    { label: "Dict", value: "dict" },
    { label: "String", value: "str" },
    { label: "Integer", value: "int" },
    { label: "Float", value: "float" },
    { label: "Boolean", value: "bool" },
    { label: "List", value: "list" },
    { label: "URL", value: "url" },
];

export const OutputsTab: React.FC<DefaultTabProps> = ({ nodeId }) => {
    const dispatch = useAppDispatch();
    const outputs = (useAppSelector((state) => workflowNodesSelectors.nodeOutputs(state, nodeId)) as Output[]) || [];

    const createDefaultOutput = (): Output => ({
        name: "New Output",
        is_default_output: false,
        bookmark: null,
        broker_id: uuidv4(),
        data_type: "dict",
        conversion: null,
        result: {
            component: null,
            bookmark: null,
            metadata: {},
        },
        relays: [],
        metadata: {},
    });

    const addOutput = () => {
        const newOutput = createDefaultOutput();
        dispatch(workflowNodesActions.addOutput({ id: nodeId, output: newOutput }));
    };

    const updateOutput = (index: number, field: keyof Output, value: any) => {
        const updatedOutputs = [...outputs];
        updatedOutputs[index] = { ...updatedOutputs[index], [field]: value };
        dispatch(workflowNodesActions.updateOutputs({ id: nodeId, outputs: updatedOutputs }));
    };

    const removeOutput = (index: number) => {
        dispatch(workflowNodesActions.removeOutput({ id: nodeId, index }));
    };

    const updateBookmarkJSON = (index: number, jsonString: string) => {
        try {
            const bookmarkObj = jsonString.trim() === "" ? null : JSON.parse(jsonString);
            updateOutput(index, "bookmark", bookmarkObj);
        } catch (error) {
            // If JSON is invalid, don't update the bookmark
            console.warn("Invalid JSON for bookmark:", error);
        }
    };

    const addRelay = (outputIndex: number) => {
        const currentRelays = outputs[outputIndex]?.relays || [];
        const newRelay: Relay = { type: "broker", id: null };
        const updatedRelays = [...currentRelays, newRelay];
        updateOutput(outputIndex, "relays", updatedRelays);
    };

    const updateRelay = (outputIndex: number, relayIndex: number, field: keyof Relay, value: any) => {
        const currentRelays = outputs[outputIndex]?.relays || [];
        const updatedRelays = [...currentRelays];
        updatedRelays[relayIndex] = { ...updatedRelays[relayIndex], [field]: value };
        updateOutput(outputIndex, "relays", updatedRelays);
    };

    const removeRelay = (outputIndex: number, relayIndex: number) => {
        const currentRelays = outputs[outputIndex]?.relays || [];
        const updatedRelays = currentRelays.filter((_, idx) => idx !== relayIndex);
        updateOutput(outputIndex, "relays", updatedRelays);
    };

    return (
        <div className="h-full flex flex-col space-y-3">
            <div className="flex items-start justify-between py-3">
                <div className="flex-1 pr-4">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Outputs allow you to define one or more variations of the node's output and set them to different brokers
                    </p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• Apply bookmarks to get different parts of the output object</li>
                        <li>• Use relays to forward the same result to multiple brokers</li>
                    </ul>
                </div>
                <div className="flex-shrink-0">
                    <Button onClick={addOutput} size="sm" variant="outline" className="h-7 px-2">
                        <Plus className="h-3 w-3" />
                        Add New Output Variation
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto space-y-2">
                {outputs.length === 0 ? (
                    <Card className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No outputs defined. Click "Add" to create your first output.
                    </Card>
                ) : (
                    outputs.map((output, index) => (
                        <SectionContainer
                            key={index}
                            title={
                                <div className="flex items-center justify-between w-full">
                                    <span>{`${output.name || "Unnamed Output"} ${
                                        output.is_default_output ? "(Default Node Output)" : "(Alternate Output)"
                                    }`}</span>
                                    <Button onClick={() => removeOutput(index)} size="xs" variant="destructive" className="px-2">
                                        <Trash2 />
                                        Remove
                                    </Button>
                                </div>
                            }
                        >
                            <div className="p-3 space-y-3">
                                {/* Main output fields in a compact grid */}
                                <div className="grid grid-cols-11 gap-2 items-end">
                                    <div className="col-span-4">
                                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Output Name</label>
                                        <Input
                                            placeholder="Output name"
                                            value={output.name || ""}
                                            onChange={(e) => updateOutput(index, "name", e.target.value)}
                                            className="h-7 text-xs mt-1"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Data Type</label>
                                        <Select
                                            value={output.data_type || "dict"}
                                            onValueChange={(value) => updateOutput(index, "data_type", value)}
                                        >
                                            <SelectTrigger className="h-7 text-xs mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {DATA_TYPES.map((type) => (
                                                    <SelectItem key={type.value} value={type.value}>
                                                        {type.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-4">
                                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Broker ID</label>
                                        <Input
                                            placeholder="Broker ID"
                                            value={output.broker_id || ""}
                                            onChange={(e) => updateOutput(index, "broker_id", e.target.value)}
                                            className="h-7 text-xs font-mono mt-1"
                                        />
                                    </div>
                                </div>

                                {/* Bookmark field */}
                                <div className="grid grid-cols-12 gap-4 items-start">
                                    <div className="col-span-3 pt-2">
                                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Extraction</label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Generate bookmarks in the "Sample Results" tab and use the "Copy Object" feature to get the
                                            exact bookmark needed for extraction of any part of this results object
                                        </p>
                                    </div>
                                    <div className="col-span-8">
                                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Bookmark</label>
                                        <textarea
                                            placeholder="To extract only a portion of the output object, paste your copied bookmark here"
                                            value={output.bookmark ? JSON.stringify(output.bookmark, null, 2) : ""}
                                            onChange={(e) => updateBookmarkJSON(index, e.target.value)}
                                            className="w-full text-xs font-mono border rounded-md px-2 py-1 bg-textured border-gray-300 dark:border-gray-600 resize-none"
                                            rows={8}
                                        />
                                    </div>
                                </div>

                                {/* Relays section */}
                                <div className="grid grid-cols-12 gap-4 items-start">
                                    <div className="col-span-3 pt-2">
                                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Relays</label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Enter a Target Broker ID to have this result automatically forwarded to the target
                                        </p>
                                    </div>
                                    <div className="col-span-8 space-y-2">
                                        {output.relays && output.relays.length > 0 && (
                                            <>
                                                {output.relays.map((relay, relayIndex) => (
                                                    <div key={relayIndex} className="flex gap-2 items-center">
                                                        <div className="flex-1">
                                                            <Input
                                                                placeholder="Enter target broker ID"
                                                                value={relay.id || ""}
                                                                onChange={(e) => updateRelay(index, relayIndex, "id", e.target.value)}
                                                                className="h-7 text-xs font-mono"
                                                            />
                                                        </div>
                                                        <Button
                                                            onClick={() => removeRelay(index, relayIndex)}
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                        <div className="flex justify-start">
                                            <Button
                                                onClick={() => addRelay(index)}
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                            >
                                                <Plus className="h-3 w-3" />
                                                Add Relay
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </SectionContainer>
                    ))
                )}
            </div>

            {/* Centered Add New Output button at the bottom */}
            <div className="flex justify-center pt-2">
                <Button onClick={addOutput} size="default" variant="primary" className="px-6 py-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Output Variation
                </Button>
            </div>
        </div>
    );
};

export default OutputsTab;
