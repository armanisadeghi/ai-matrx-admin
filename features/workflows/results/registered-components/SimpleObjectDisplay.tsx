// features/workflows/results/registered-components/SimpleObjectDisplay.tsx
"use client";

import React, { useMemo } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { brokerSelectors } from "@/lib/redux/brokerSlice";

interface SimpleObjectDisplayProps {
    brokerId: string;
    keyToDisplay?: string;
}

const SimpleObjectDisplay: React.FC<SimpleObjectDisplayProps> = ({ brokerId, keyToDisplay }) => {
    const data = useAppSelector((state) => brokerSelectors.selectValue(state, brokerId));
    
    const dataToUse = useMemo(() => {
        if (!keyToDisplay) {
            return data;
        }
        return data?.[keyToDisplay];
    }, [data, keyToDisplay]);
    
    const renderValue = (value: any, key?: string): React.ReactNode => {
        // Handle null/undefined
        if (value === null) return <span className="text-gray-500 italic">null</span>;
        if (value === undefined) return <span className="text-gray-500 italic">undefined</span>;
        
        // Handle primitives
        if (typeof value === 'string') {
            return <span className="break-words">{value}</span>;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return <span className="text-blue-600">{String(value)}</span>;
        }
        
        // Handle arrays
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return <span className="text-gray-500 italic">[]</span>;
            }
            
            return (
                <div className="ml-4 space-y-1">
                    {value.map((item, index) => (
                        <div key={index} className="flex gap-2">
                            <span className="text-gray-400 text-xs font-mono shrink-0">[{index}]</span>
                            <div className="min-w-0 flex-1">
                                {renderValue(item)}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }
        
        // Handle objects
        if (typeof value === 'object') {
            const entries = Object.entries(value);
            if (entries.length === 0) {
                return <span className="text-gray-500 italic">{'{}'}</span>;
            }
            
            return (
                <div className="ml-4 space-y-1">
                    {entries.map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                            <span className="font-semibold text-gray-700 shrink-0">{k}:</span>
                            <div className="min-w-0 flex-1">
                                {renderValue(v, k)}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }
        
        // Fallback for functions, symbols, etc.
        return <span className="text-gray-500 italic">{String(value)}</span>;
    };
    
    if (!dataToUse) {
        return <div className="text-gray-500 italic">Content not available</div>;
    }
    
    // If the root data is an array, handle it specially
    if (Array.isArray(dataToUse)) {
        return (
            <div className="text-sm space-y-1">
                {dataToUse.map((item, index) => (
                    <div key={index} className="flex gap-2">
                        <span className="text-gray-400 text-xs font-mono shrink-0">[{index}]</span>
                        <div className="min-w-0 flex-1">
                            {renderValue(item)}
                        </div>
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
                    <div key={key} className="flex gap-2">
                        <span className="font-semibold text-gray-700 shrink-0">{key}:</span>
                        <div className="min-w-0 flex-1">
                            {renderValue(value, key)}
                        </div>
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

export default SimpleObjectDisplay;