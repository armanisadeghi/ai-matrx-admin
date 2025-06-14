"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/styles/themes/ThemeProvider";
import { DbUserInput } from "@/features/workflows/types";
import { NodeDropdownMenu } from "@/features/workflows/components/menus/NodeDropdownMenu";
import { BsThreeDots } from "react-icons/bs";
import { NodeContextMenu } from "@/features/workflows/components/menus/NodeContextMenu";
import { EnrichedBroker } from '@/features/workflows/utils/data-flow-manager';

interface UserInputNodeProps {
    data: DbUserInput;
    selected: boolean;
    onDelete?: (nodeId: string) => void;
    onEdit?: (nodeData: DbUserInput) => void;
    onDuplicate?: (nodeId: string) => void;
    enrichedBrokers: EnrichedBroker[];
}

const UserInputNode: React.FC<UserInputNodeProps> = ({ data, selected, onDelete, onEdit, onDuplicate, enrichedBrokers }) => {
    const { mode } = useTheme();
    const [mounted, setMounted] = useState(false);

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
                                    className="font-medium text-[9px] text-foreground text-center flex-1"
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
                        <div className="bg-emerald-100 dark:bg-emerald-900/50 rounded px-2 py-1 text-[8px]">
                            {data.broker_id || "Not set"}
                        </div>

                        {/* Value preview */}
                        <div className="space-y-1">
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-emerald-300 dark:border-emerald-700">
                                {data.data_type || "str"}
                            </Badge>
                            <div className="text-[9px] text-emerald-700 dark:text-emerald-300 truncate bg-white dark:bg-emerald-950/50 rounded px-1 py-0.5">
                                {getValueDisplay()}
                            </div>
                        </div>
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
