// File: features/workflows/results/registered-components/BraveSearchViewer.tsx
"use client";

import React, { useMemo } from "react";
import { DbFunctionNode } from "@/features/workflows/types";
import { brokerSelectors } from "@/lib/redux/brokerSlice";
import { useAppSelector } from "@/lib/redux/hooks";
import BraveSearchDisplay, { BraveSearchData } from "./BraveSearchDisplay";

interface ViewerProps {
    nodeData: DbFunctionNode;
    brokerId?: string;
    keyToDisplay?: string;
}

/**
 * Redux-connected wrapper for BraveSearchDisplay
 * Handles data fetching from the broker system
 */
const BraveSearchViewer: React.FC<ViewerProps> = ({ nodeData, brokerId, keyToDisplay }) => {
    if (!brokerId) {
        brokerId = nodeData?.return_broker_overrides?.[0];
    }

    const rawData = useAppSelector((state) => brokerSelectors.selectValue(state, brokerId));

    const data: BraveSearchData = useMemo(() => {
        if (!keyToDisplay) {
            return rawData;
        }
        return rawData?.[keyToDisplay];
    }, [rawData, keyToDisplay]);

    // Use the display component with the fetched data
    return <BraveSearchDisplay data={data} />;
};

export default React.memo(BraveSearchViewer);