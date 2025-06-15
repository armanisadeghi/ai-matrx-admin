"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useTheme } from "@/styles/themes/ThemeProvider";
import { DbUserInput } from "@/features/workflows/types";
import { NodeDropdownMenu } from "@/features/workflows/components/menus/NodeDropdownMenu";
import { BsThreeDots } from "react-icons/bs";
import { NodeContextMenu } from "@/features/workflows/components/menus/NodeContextMenu";
import FieldsWithFetch from "@/features/applet/runner/fields/core/FieldsWithFetch";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { Button } from "@/components/ui/button";
import { brokerActions, BrokerMapEntry } from "@/lib/redux/brokerSlice";
import { BrokerDisplay } from "@/components/ui/broker-display";

/**
 * UserInputNode - A React Flow node component for user input fields
 * 
 * FIELD RENDERING ISOLATION:
 * This component uses a CSS isolation wrapper to prevent React Flow styling conflicts
 * with the FieldsWithFetch component. The isolation includes:
 * - CSS containment and isolation properties
 * - Style resets for form elements  
 * - Proper dark mode support
 * - Constrained sizing optimized for React Flow nodes
 * 
 * The isolation wrapper ensures form fields render correctly within the constrained 
 * React Flow node environment without losing functionality or styling.
 */

interface UserInputNodeProps {
    data: DbUserInput;
    selected: boolean;
    onDelete?: (nodeId: string) => void;
    onEdit?: (nodeData: DbUserInput) => void;
    onDuplicate?: (nodeId: string) => void;
}

const UserInputNode: React.FC<UserInputNodeProps> = ({ data, selected, onDelete, onEdit, onDuplicate }) => {
    const { mode } = useTheme();
    const [mounted, setMounted] = useState(false);
    const dispatch = useAppDispatch();
    
    const enrichedBrokers = window.workflowEnrichedBrokers || [];

    const brokerMap = useAppSelector((state) => state.broker?.brokerMap || {});

    useEffect(() => {
        setMounted(true);

        // Add dark mode class to container if in dark mode
        const container = document.body;
        if (mode === "dark") {
            container.classList.add("react-flow-dark-mode");
        } else {
            container.classList.remove("react-flow-dark-mode");
        }

        return () => {
            container.classList.remove("react-flow-dark-mode");
        };
    }, [mode]);

    const getValueDisplay = () => {
        if (data.default_value === null || data.default_value === undefined) return "No value";
        if (typeof data.default_value === "object") return JSON.stringify(data.default_value);
        return String(data.default_value);
    };

    // Check if there's a valid mapping for this field and broker
    const hasValidMapping = data.field_component_id && data.broker_id && 
        Object.values(brokerMap).find(
            (entry) => entry.mappedItemId === data.field_component_id && entry.brokerId === data.broker_id
        );

    // Auto-create mapping if node has both IDs but no mapping exists (workflow restore scenario)
    useEffect(() => {
        if (data.broker_id && data.field_component_id && !hasValidMapping) {
            const autoMapping: BrokerMapEntry = {
                brokerId: data.broker_id,
                mappedItemId: data.field_component_id,
                source: "workflows",
                sourceId: data.workflow_id,
            };
            dispatch(brokerActions.addOrUpdateRegisterEntry(autoMapping));
        }
    }, [data.broker_id, data.field_component_id, hasValidMapping, data.workflow_id, dispatch]);

    const nodeContent = (
        <div className="relative">
            <Card
                className={`min-w-52 max-w-52 transition-all duration-200
              ${selected ? "ring-2 ring-emerald-500 shadow-lg" : "hover:shadow-md"}
              bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800
            `}
            >
                <CardHeader>
                    <div className="space-y-2 border-b border-gray-200 dark:border-gray-600 pb-1">
                        {/* Step name takes full top row - made smaller */}
                        <div className="w-full flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 flex-1">
                                <h3
                                    className="font-medium text-[8px] text-foreground text-center flex-1"
                                    title={data.label || "User Input"}
                                >
                                    {data.label || "User Input"}
                                </h3>
                            </div>
                            {/* Three dots menu */}
                            <NodeDropdownMenu data={data} onEditUserInput={onEdit} onDuplicate={onDuplicate} onDelete={onDelete}>
                                <button className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-200">
                                    <BsThreeDots className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                                </button>
                            </NodeDropdownMenu>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-1">
                    <div className="space-y-2">
                        {/* Broker ID display */}
                        <div className="bg-emerald-100 dark:bg-emerald-900/50 rounded px-2 py-1">
                            {data.broker_id ? (
                                <BrokerDisplay 
                                    brokerId={data.broker_id} 
                                    className="text-[8px]"
                                />
                            ) : (
                                <span className="text-[8px]">Not set</span>
                            )}
                        </div>
                        {hasValidMapping ? (
                            <div className="field-isolation-wrapper  p-2 overflow-hidden">
                                <div className="all-revert w-full">
                                    <FieldsWithFetch 
                                        fieldIds={[data.field_component_id]} 
                                        sourceId={data.workflow_id} 
                                        source="workflows"
                                        className="w-full text-xs"
                                        wrapperClassName="mb-1 last:mb-0"
                                        showLabels={false}
                                        showHelpText={false}
                                        showRequired={false}
                                    />
                                </div>
                            </div>
                        ) : (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full text-[10px] h-6"
                                onClick={() => onEdit?.(data)}
                            >
                                Configure User Input Field
                            </Button>
                        )}


                    </div>
                </CardContent>
            </Card>

            {/* ReactFlow Handle for output connections */}
        </div>
    );

    return (
        <NodeContextMenu data={data} onEditUserInput={onEdit} onDuplicate={onDuplicate} onDelete={onDelete}>
            {nodeContent}
        </NodeContextMenu>
    );
};

export default UserInputNode;
