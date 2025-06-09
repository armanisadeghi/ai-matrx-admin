"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useTheme } from "@/styles/themes/ThemeProvider";
import { ArrowRightLeft, Edit, Trash2, Copy, Plus } from "lucide-react";
import { BrokerRelayData } from "@/features/workflows/types";

interface BrokerRelayNodeProps {
    data: BrokerRelayData;
    selected: boolean;
    onDelete?: (nodeId: string) => void;
    onEdit?: (nodeData: any) => void;
    onDuplicate?: (nodeId: string) => void;
    onDuplicateRPC?: (nodeId: string) => void;
}

const BrokerRelayNode: React.FC<BrokerRelayNodeProps> = ({ data, selected, onDelete, onEdit, onDuplicate, onDuplicateRPC }) => {
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

    const nodeContent = (
        <Card
            className={`
      min-w-24 max-w-28 transition-all duration-200 cursor-pointer
      ${selected ? "ring-2 ring-blue-500 shadow-lg" : "hover:shadow-md"}
      bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800
    `}
        >
            <CardContent className="p-2 ">
                <div className="flex flex-col items-center gap-1 ">
                    <ArrowRightLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <div className="text-center">
                        <p className="font-medium text-xs text-blue-900 dark:text-blue-100 break-words">{data.label}</p>
                        <p className="text-[9px] text-blue-700 dark:text-blue-300">
                            {data.targets?.length || 0} → {data.targets?.length || 0}
                        </p>
                    </div>
                </div>

                {/* Connection points - input and output */}
                <div className="absolute -left-1.5 top-1/2 transform -translate-y-1/2 w-2.5 h-2.5 bg-blue-500 rounded-full border border-background shadow-sm"></div>
                <div className="absolute -right-1.5 top-1/2 transform -translate-y-1/2 w-2.5 h-2.5 bg-blue-500 rounded-full border border-background shadow-sm"></div>
            </CardContent>
        </Card>
    );

    // Only wrap in ContextMenu if we have delete/edit/duplicate handlers
    if (onDelete || onEdit || onDuplicate || onDuplicateRPC) {
        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>{nodeContent}</ContextMenuTrigger>
                <ContextMenuContent>
                    {onEdit && (
                        <ContextMenuItem onClick={() => onEdit(data)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Relay
                        </ContextMenuItem>
                    )}
                    {onDuplicate && (
                        <ContextMenuItem onClick={() => onDuplicate(data.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate Relay (Custom)
                        </ContextMenuItem>
                    )}
                    {onDuplicateRPC && (
                        <ContextMenuItem onClick={() => onDuplicateRPC(data.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate Relay (RPC)
                        </ContextMenuItem>
                    )}
                    <ContextMenuItem onClick={() => navigator.clipboard.writeText(data.source)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Source ID
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => navigator.clipboard.writeText(JSON.stringify(data.targets))}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Target IDs
                    </ContextMenuItem>
                    {onDelete && (
                        <ContextMenuItem onClick={() => onDelete(data.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Relay
                        </ContextMenuItem>
                    )}
                </ContextMenuContent>
            </ContextMenu>
        );
    }

    return nodeContent;
};

export default BrokerRelayNode;
