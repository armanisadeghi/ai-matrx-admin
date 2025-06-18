// features/workflows/results/registered-components/SmartDisplay.tsx
"use client";
import React, { useMemo } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { brokerSelectors } from "@/lib/redux/brokerSlice";
import { DbFunctionNode } from "@/features/workflows/types";

interface SmartDisplayProps {
    nodeData: DbFunctionNode;
    brokerId?: string;
    keyToDisplay?: string;
}

const SmartDisplay: React.FC<SmartDisplayProps> = ({ nodeData, brokerId, keyToDisplay }) => {

    if (!brokerId) {
        brokerId = nodeData.return_broker_overrides[0];
    }

    const data = useAppSelector((state) => brokerSelectors.selectValue(state, brokerId));
    
    const dataToUse = useMemo(() => {
        if (!keyToDisplay) {
            return data;
        }
        return data?.[keyToDisplay];
    }, [data, keyToDisplay]);
    
    if (!dataToUse) {
        return <div>Content not available</div>;
    }

    const renderValue = (value: any, isNested = false): React.ReactNode => {
        // Handle null/undefined
        if (value === null) return <span className="text-slate-500 dark:text-slate-400 italic">null</span>;
        if (value === undefined) return <span className="text-slate-500 dark:text-slate-400 italic">undefined</span>;
        
        // Handle primitives
        if (typeof value === 'string') {
            return <span className="break-words text-slate-900 dark:text-slate-100">{value}</span>;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return <span className="text-blue-600 dark:text-blue-400">{String(value)}</span>;
        }
        
        // Handle arrays
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return <span className="text-slate-500 dark:text-slate-400 italic">No items</span>;
            }
            
            return (
                <div className={isNested ? "pl-3 space-y-1" : "space-y-1"}>
                    {value.map((item, index) => (
                        <div key={index} className="py-1 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                            {renderValue(item, true)}
                        </div>
                    ))}
                </div>
            );
        }
        
        // Handle objects
        if (typeof value === 'object') {
            const entries = Object.entries(value);
            if (entries.length === 0) {
                return <span className="text-slate-500 dark:text-slate-400 italic">No data</span>;
            }
            
            return (
                <div className={isNested ? "pl-3 space-y-1" : "space-y-1"}>
                    {entries.map(([k, v]) => (
                        <div key={k} className="py-1">
                            <span className="font-medium text-slate-800 dark:text-slate-200 mr-2">{k}:</span>
                            {renderValue(v, true)}
                        </div>
                    ))}
                </div>
            );
        }
        
        // Fallback
        return <span className="text-slate-500 dark:text-slate-400">{String(value)}</span>;
    };
    
    if (!dataToUse) {
        return <div className="text-slate-500 dark:text-slate-400 italic">Content not available</div>;
    }
    
    // Smart rendering based on data type
    // If it's a string, use the simple pre-formatted display
    if (typeof dataToUse === 'string') {
        return (
            <pre className="whitespace-pre-wrap text-sm break-words text-slate-900 dark:text-slate-100">
                {dataToUse}
            </pre>
        );
    }
    
    // If the root data is an array
    if (Array.isArray(dataToUse)) {
        if (dataToUse.length === 0) {
            return <div className="text-slate-500 dark:text-slate-400 italic">No items</div>;
        }
        
        return (
            <div className="text-sm space-y-2">
                {dataToUse.map((item, index) => (
                    <div key={index} className="p-2 bg-slate-50 dark:bg-slate-800 rounded border-l-2 border-slate-200 dark:border-slate-600">
                        {renderValue(item, false)}
                    </div>
                ))}
            </div>
        );
    }
    
    // If the root data is an object
    if (typeof dataToUse === 'object' && dataToUse !== null) {
        const entries = Object.entries(dataToUse);
        return (
            <div className="text-sm space-y-1">
                {entries.map(([key, value]) => (
                    <div key={key} className="py-1">
                        <span className="font-medium text-slate-800 dark:text-slate-200 mr-2">{key}:</span>
                        {renderValue(value, true)}
                    </div>
                ))}
            </div>
        );
    }
    
    // If the root data is a primitive
    return (
        <div className="text-sm">
            {renderValue(dataToUse)}
        </div>
    );
};

export default SmartDisplay;