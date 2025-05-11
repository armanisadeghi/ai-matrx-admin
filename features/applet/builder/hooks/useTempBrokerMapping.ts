import { useState, useEffect } from "react";
import { setBrokerMap } from "@/lib/redux/app-runner/slices/brokerSlice";
import { useAppDispatch } from "@/lib/redux/hooks";
import { v4 as uuidv4 } from "uuid";
import { ComponentType } from "@/types/customAppTypes";
import { componentOptions } from "@/features/applet/constants/field-constants";

export default function useTempBrokerMapping(fieldId: string) {
    const [stableAppletId] = useState<string>(uuidv4());
    const [mappings, setMappings] = useState<Map<string, string>>(new Map());
    const dispatch = useAppDispatch();

    // Generate broker mappings for all component types on initial render
    useEffect(() => {
        if (!fieldId) return;

        const newMappings = new Map<string, string>();
        
        // Original field mapping
        newMappings.set(fieldId, uuidv4());
        
        // Create mappings for all possible component types
        componentOptions.forEach(option => {
            const previewFieldId = `${fieldId}-${option.value}`;
            newMappings.set(previewFieldId, uuidv4());
        });
        
        setMappings(newMappings);
    }, [fieldId]);

    // Set broker mappings whenever they change
    useEffect(() => {
        if (!fieldId || mappings.size === 0) return;

        const brokerMappings = Array.from(mappings).map(([itemId, brokerId]) => ({
            source: "applet",
            sourceId: stableAppletId,
            itemId,
            brokerId,
        }));

        dispatch(setBrokerMap(brokerMappings));
    }, [fieldId, mappings, stableAppletId, dispatch]);

    // Get a field ID for a specific component type preview
    const getPreviewFieldId = (componentType: ComponentType | null) => {
        if (!componentType || !fieldId) return fieldId;
        return `${fieldId}-${componentType}`;
    };

    return { 
        stableAppletId,
        getPreviewFieldId
    };
}
