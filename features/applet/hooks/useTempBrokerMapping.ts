import { useState, useEffect } from "react";
import { setBrokerMap } from "@/lib/redux/app-runner/slices/brokerSlice";
import { useAppDispatch } from "@/lib/redux/hooks";
import { v4 as uuidv4 } from "uuid";
import { ComponentType } from "@/types/customAppTypes";
import { componentOptions } from "@/features/applet/constants/field-constants";

export default function useTempBrokerMapping(fieldId: string) {
    const [stableAppletId] = useState(() => uuidv4());
    const dispatch = useAppDispatch();

    // Set up broker mappings on mount
    useEffect(() => {
        if (!fieldId) return;

        const mappings = [];
        
        // Original field mapping
        mappings.push({
            source: "applet",
            sourceId: stableAppletId,
            itemId: fieldId,
            brokerId: uuidv4()
        });
        
        // Create mappings for all possible component types
        componentOptions.forEach(option => {
            mappings.push({
                source: "applet",
                sourceId: stableAppletId,
                itemId: `${fieldId}-${option.value}`,
                brokerId: uuidv4()
            });
        });
        
        dispatch(setBrokerMap(mappings));
    }, [fieldId, stableAppletId, dispatch]);

    // Simple function to get a field ID for a specific component type
    const getPreviewFieldId = (componentType: ComponentType | null) => {
        if (!componentType) return fieldId;
        return `${fieldId}-${componentType}`;
    };

    return { 
        stableAppletId,
        getPreviewFieldId
    };
}
