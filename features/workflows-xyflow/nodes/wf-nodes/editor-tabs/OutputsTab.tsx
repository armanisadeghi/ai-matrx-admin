"use client";

import React, { useState } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { workflowNodeSelectors } from "@/lib/redux/workflow-node/selectors";
import { workflowNodeActions } from "@/lib/redux/workflow-node/slice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { DefaultTabProps } from "./types";
import { Output, Relay, Bookmark } from "@/lib/redux/workflow/types";


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
    const outputs = useAppSelector((state) => workflowNodeSelectors.nodeOutputs(state, nodeId)) as Output[] || [];
    const registeredFunction = useAppSelector((state) => workflowNodeSelectors.nodeRegisteredFunction(state, nodeId));

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
            metadata: {}
        },
        relays: [],
        metadata: {}
    });

    const addOutput = () => {
        const newOutput = createDefaultOutput();
        dispatch(workflowNodeActions.addNodeOutput({ nodeId, output: newOutput }));
    };

    const updateOutput = (index: number, field: keyof Output, value: any) => {
        const updatedOutputs = [...outputs];
        updatedOutputs[index] = { ...updatedOutputs[index], [field]: value };
        dispatch(workflowNodeActions.updateNodeOutputs({ nodeId, outputs: updatedOutputs }));
    };

    const removeOutput = (index: number) => {
        dispatch(workflowNodeActions.removeNodeOutput({ nodeId, index }));
    };

    const updateBookmark = (index: number, bookmarkField: keyof Bookmark, value: any) => {
        const currentBookmark = outputs[index]?.bookmark || {};
        const updatedBookmark = { ...currentBookmark, [bookmarkField]: value };
        updateOutput(index, 'bookmark', updatedBookmark);
    };

    const addRelay = (outputIndex: number) => {
        const currentRelays = outputs[outputIndex]?.relays || [];
        const newRelay: Relay = { type: null, id: null };
        const updatedRelays = [...currentRelays, newRelay];
        updateOutput(outputIndex, 'relays', updatedRelays);
    };

    const updateRelay = (outputIndex: number, relayIndex: number, field: keyof Relay, value: any) => {
        const currentRelays = outputs[outputIndex]?.relays || [];
        const updatedRelays = [...currentRelays];
        updatedRelays[relayIndex] = { ...updatedRelays[relayIndex], [field]: value };
        updateOutput(outputIndex, 'relays', updatedRelays);
    };

    const removeRelay = (outputIndex: number, relayIndex: number) => {
        const currentRelays = outputs[outputIndex]?.relays || [];
        const updatedRelays = currentRelays.filter((_, idx) => idx !== relayIndex);
        updateOutput(outputIndex, 'relays', updatedRelays);
    };

    return (
        <div className="h-full flex flex-col space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Outputs ({outputs.length})</span>
                <Button onClick={addOutput} size="sm" variant="outline" className="h-7 px-2">
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                </Button>
            </div>

            <div className="flex-1 overflow-auto space-y-2">
                {outputs.length === 0 ? (
                    <Card className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No outputs defined. Click "Add" to create your first output.
                    </Card>
                ) : (
                    outputs.map((output, index) => (
                        <Card key={index} className="p-3 space-y-2">
                            {/* Main output fields in a compact grid */}
                            <div className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-4">
                                    <Input
                                        placeholder="Output name"
                                        value={output.name || ""}
                                        onChange={(e) => updateOutput(index, 'name', e.target.value)}
                                        className="h-7 text-xs"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Select
                                        value={output.data_type || "dict"}
                                        onValueChange={(value) => updateOutput(index, 'data_type', value)}
                                    >
                                        <SelectTrigger className="h-7 text-xs">
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
                                    <Input
                                        placeholder="Broker ID"
                                        value={output.broker_id || ""}
                                        onChange={(e) => updateOutput(index, 'broker_id', e.target.value)}
                                        className="h-7 text-xs font-mono"
                                    />
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <Button
                                        onClick={() => removeOutput(index)}
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>

                            {/* Bookmark section */}
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    placeholder="Bookmark name"
                                    value={output.bookmark?.name || ""}
                                    onChange={(e) => updateBookmark(index, 'name', e.target.value)}
                                    className="h-7 text-xs"
                                />
                                <Input
                                    placeholder="Bookmark path (comma-separated)"
                                    value={output.bookmark?.path?.join(', ') || ""}
                                    onChange={(e) => updateBookmark(index, 'path', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                    className="h-7 text-xs"
                                />
                            </div>

                            {/* Relays section */}
                            {output.relays && output.relays.length > 0 && (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600 dark:text-gray-400">Relays</span>
                                        <Button
                                            onClick={() => addRelay(index)}
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 px-2 text-xs"
                                        >
                                            <Plus className="h-2 w-2 mr-1" />
                                            Relay
                                        </Button>
                                    </div>
                                    {output.relays.map((relay, relayIndex) => (
                                        <div key={relayIndex} className="grid grid-cols-12 gap-1 items-center">
                                            <div className="col-span-5">
                                                <Input
                                                    placeholder="Relay type"
                                                    value={relay.type || ""}
                                                    onChange={(e) => updateRelay(index, relayIndex, 'type', e.target.value)}
                                                    className="h-6 text-xs"
                                                />
                                            </div>
                                            <div className="col-span-6">
                                                <Input
                                                    placeholder="Relay ID"
                                                    value={relay.id || ""}
                                                    onChange={(e) => updateRelay(index, relayIndex, 'id', e.target.value)}
                                                    className="h-6 text-xs font-mono"
                                                />
                                            </div>
                                            <div className="col-span-1 flex justify-end">
                                                <Button
                                                    onClick={() => removeRelay(index, relayIndex)}
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                                >
                                                    <X className="h-2 w-2" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add relay button if no relays exist */}
                            {(!output.relays || output.relays.length === 0) && (
                                <div className="flex justify-start">
                                    <Button
                                        onClick={() => addRelay(index)}
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                                    >
                                        <Plus className="h-2 w-2 mr-1" />
                                        Add Relay
                                    </Button>
                                </div>
                            )}
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default OutputsTab;
