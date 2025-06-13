"use client";

import React, { useState, useEffect } from "react";
import { Connection, Handle, Position } from "reactflow";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useTheme } from "@/styles/themes/ThemeProvider";
import { DbBrokerRelayData } from "@/features/workflows/types";
import { NodeDropdownMenu } from "../../components/menus/NodeDropdownMenu";
import { BsThreeDots } from "react-icons/bs";
import { NodeContextMenu } from "../../components/menus/NodeContextMenu";
import { Input, Output, parseEdge } from "../../utils/node-utils";

interface BrokerRelayNodeProps {
    data: DbBrokerRelayData;
    inputsAndOutputs: { inputs: Input[]; outputs: Output[] };
    selected: boolean;
    onDelete?: (nodeId: string) => void;
    onEdit?: (nodeData: DbBrokerRelayData) => void;
    onDuplicate?: (nodeId: string) => void;
    onConnect?: (connection: Connection) => void;
}

const BrokerRelayNode: React.FC<BrokerRelayNodeProps> = ({ data, inputsAndOutputs, selected, onDelete, onEdit, onDuplicate, onConnect }) => {
    const { mode } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { inputs, outputs } = inputsAndOutputs;

    const calculateHandlePosition = (index: number, total: number, isOutput: boolean = false) => {
        // Account for header height, padding, and spacing
        const headerHeight = 40;
        const contentPadding = 0;
        const itemHeight = 16;
        const itemSpacing = 1;
        const separatorHeight = 1;
        const separatorMargin = 10;

        let baseOffset = headerHeight + contentPadding;

        if (isOutput) {
            const inputsSectionHeight = Math.max(1, inputs.length) * (itemHeight + itemSpacing);
            baseOffset += inputsSectionHeight + separatorHeight + separatorMargin;
        }

        const itemOffset = index * (itemHeight + itemSpacing) + itemHeight / 2;

        return baseOffset + itemOffset;
    };
    
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

    const cardClassName = `min-w-52 max-w-52 transition-all duration-200 ${
        selected ? "ring-2 ring-blue-500 shadow-lg" : "hover:shadow-md"
    } bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800`;

    const borderColorHandles = () => {
        if (mode === "dark") {
            return "0.5px solid white";
        }
        return "0.5px solid black";
    };

    const nodeContent = (
        <div className="relative">
            <Card className={cardClassName}>
                <CardHeader>
                    <div className="space-y-2 border-b border-gray-200 dark:border-gray-600 pb-1">
                        {/* Step name takes full top row - made smaller */}
                        <div className="w-full flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 flex-1">
                                <h3
                                    className="font-medium text-[9px] text-foreground text-center flex-1"
                                    title={data.label || "Broker Relay"}
                                >
                                    {data.label || "Broker Relay"}
                                </h3>
                            </div>
                            {/* Three dots menu */}
                            <NodeDropdownMenu data={data} onEditRelay={onEdit} onDuplicate={onDuplicate} onDelete={onDelete}>
                                <button className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-200">
                                    <BsThreeDots className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                                </button>
                            </NodeDropdownMenu>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-1 min-h-44">
                    <div className="flex flex-col h-full space-y-2">
                        {/* Put these on the left */}
                        <div className="flex-1">
                            <div className="space-y-1">
                                {inputs.slice(0, 8).map((input) => (
                                    <div key={input.id} className="flex items-center justify-end group relative">
                                        <span className="text-[8px] text-gray-700 dark:text-gray-300 truncate block w-full pl-1 pr-4 text-left">
                                            {input.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Separator line */}
                        <div className="h-px bg-gray-200 dark:bg-gray-700"></div>
                        {/* Put these on the right */}
                        <div className="flex-1">
                            <div className="space-y-1">
                                {outputs.slice(0, 8).map((output) => (
                                    <div key={output.id} className="flex items-center justify-end group relative">
                                        <span className="text-[8px] text-gray-700 dark:text-gray-300 truncate block w-full pr-1 pl-4 text-right">
                                            {output.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Individual Input Handles - aligned with each input */}
            {inputs.slice(0, 8).map((input, index) => (
                <Handle
                    key={input.handleId}
                    type="target"
                    position={Position.Left}
                    id={input.handleId}
                    isConnectableEnd={true}
                    isConnectableStart={false}
                    onConnect={onConnect}
                    style={{
                        top: `${calculateHandlePosition(index, inputs.length, false)}px`,
                        width: "8px",
                        height: "8px",
                        backgroundColor: "#3b82f6",
                        border: borderColorHandles(),
                        left: -4,
                    }}
                />
            ))}

            {/* Individual Output Handles - aligned with each output */}
            {outputs.slice(0, 8).map((output, index) => (
                <Handle
                    key={output.handleId}
                    type="source"
                    position={Position.Right}
                    id={output.handleId}
                    isConnectableEnd={false}
                    isConnectableStart={true}
                    onConnect={onConnect}
                    style={{
                        top: `${calculateHandlePosition(index, outputs.length, true)}px`,
                        width: "8px",
                        height: "8px",
                        backgroundColor: "#22c55e",
                        border: borderColorHandles(),
                        right: -4,
                    }}
                />
            ))}
        </div>
    );

    return (
        <NodeContextMenu data={data} onEditRelay={onEdit} onDuplicate={onDuplicate} onDelete={onDelete}>
            {nodeContent}
        </NodeContextMenu>
    );
};

export default BrokerRelayNode;
