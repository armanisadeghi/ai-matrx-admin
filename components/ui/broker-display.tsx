"use client";

import React from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Input, Output, parseEdge } from "@/features/workflows/utils/node-utils";

interface BrokerDisplayProps {
    brokerId: string;
    className?: string;
}

export const BrokerDisplay: React.FC<BrokerDisplayProps> = ({ brokerId, className = "" }) => {
    const enrichedBrokers = window.workflowEnrichedBrokers || [];
    const broker = enrichedBrokers?.find(b => b.id === brokerId);
    const displayName = broker?.name || broker?.knownBrokerData?.name;
    const showName = !!displayName;


    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(brokerId);
            toast.success("Broker ID copied");
        } catch (err) {
            toast.error("Failed to copy");
        }
    };

    return (
        <div className={`inline-flex items-center gap-1 ${className}`}>
            <span className={showName ? "" : "text-[8px] font-mono"}>
                {showName ? displayName : brokerId}
            </span>
            <Copy 
                className="h-2 w-2 cursor-pointer hover:opacity-70" 
                onClick={handleCopy}
            />
        </div>
    );
};

interface BrokerInputOutputDisplayProps {
    inputOrOutput: Input | Output;
    isInput: boolean;
}


export const BrokerInputOutputDisplay: React.FC<BrokerInputOutputDisplayProps> = ({ inputOrOutput, isInput }) => {
    const enrichedBrokers = window.workflowEnrichedBrokers || [];
    const broker = enrichedBrokers?.find(b => b.id === inputOrOutput.id);
    const displayName = broker?.knownBrokerData?.name;
    const showName = !!displayName;


    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inputOrOutput.id);
            toast.success("Broker ID copied");
        } catch (err) {
            toast.error("Failed to copy");
        }
    };

    return (
        <div className="flex items-center justify-end group relative">
            <Copy 
                className="h-2 w-2 cursor-pointer hover:opacity-70 absolute left-0 opacity-0 group-hover:opacity-100 transition-opacity z-10" 
                onClick={handleCopy}
            />
            <span className={`text-[8px] text-gray-700 dark:text-gray-300 truncate block w-full ${
                isInput ? 'pl-1 pr-4 text-left' : 'pr-1 pl-4 text-right'
            }`}>
                {showName ? displayName : inputOrOutput.label}
            </span>
        </div>
    );
};
