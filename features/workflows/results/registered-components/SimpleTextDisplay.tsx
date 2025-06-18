// features/workflows/results/registered-components/SimpleTextDisplay.tsx
"use client";

import React, { useMemo } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { brokerSelectors } from "@/lib/redux/brokerSlice";

interface SimpleTextDisplayProps {
    brokerId: string;
    keyToDisplay: string;
}

const SimpleTextDisplay: React.FC<SimpleTextDisplayProps> = ({ brokerId, keyToDisplay }) => {
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

    return (
        <pre className="whitespace-pre-wrap text-sm font-mono">
            {dataToUse?.[keyToDisplay]}
        </pre>
    );
};

export default SimpleTextDisplay;