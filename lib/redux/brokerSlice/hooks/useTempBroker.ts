// lib/redux/brokerSlice/hooks/useTempBroker.ts
import { useEffect, useRef, useState, useCallback } from "react";
import { useAppDispatch } from "@/lib/redux";
import { createTempBroker, createTempBrokerMappings } from "@/lib/redux/brokerSlice/thunks/temp-mapping";
import { BrokerIdentifier } from "@/lib/redux/brokerSlice/types";
import { normalizeFieldDefinition } from "@/types/customAppTypes";
import { FieldDefinition } from "@/types/customAppTypes";
import { normalizeFieldDefinitionWithUuid } from "@/features/applet/utils/field-normalization";

// Hook for a single temporary broker
export function useTempBroker(
    source: string,
    options?: {
        sourceId?: string;
        id?: string;
        brokerId?: string;
    }
) {
    const dispatch = useAppDispatch();
    const [identifier, setIdentifier] = useState<BrokerIdentifier | null>(null);

    useEffect(() => {
        dispatch(createTempBroker({ source, ...options }))
            .unwrap()
            .then((result) => {
                setIdentifier(result.identifier);
            });
    }, [dispatch, source, options?.sourceId, options?.id, options?.brokerId]);

    return identifier;
}

// Hook for multiple temporary brokers
export function useTempBrokers(
    source: string,
    count: number,
    options?: {
        sourceId?: string;
        itemIdPattern?: (index: number) => string;
        brokerIdPattern?: (index: number) => string;
    }
) {
    const dispatch = useAppDispatch();
    const [result, setResult] = useState<{
        sourceId: string;
        identifiers: BrokerIdentifier[];
    } | null>(null);

    useEffect(() => {
        dispatch(
            createTempBrokerMappings({
                source,
                count,
                ...options,
            })
        )
            .unwrap()
            .then((result) => {
                setResult({
                    sourceId: result.sourceId,
                    identifiers: result.identifiers,
                });
            });
    }, [dispatch, source, count, options?.sourceId]);

    return result;
}

// Hook specifically for preview scenarios
export function usePreviewBrokers(fieldId: string, componentTypes: string[]) {
    const dispatch = useAppDispatch();
    const [state, setState] = useState<{
        sourceId: string | null;
        identifierMap: Map<string | undefined, BrokerIdentifier> | null;
        isComplete: boolean;
    }>({
        sourceId: null,
        identifierMap: null,
        isComplete: false,
    });

    // Flag to avoid unnecessary re-renders
    const effectRanRef = useRef(false);
    const prevFieldIdRef = useRef(fieldId);
    const prevTypesRef = useRef<string[]>(componentTypes);

    // Only reset the effect flag if dependencies actually change
    if (prevFieldIdRef.current !== fieldId || JSON.stringify(prevTypesRef.current) !== JSON.stringify(componentTypes)) {
        effectRanRef.current = false;
        prevFieldIdRef.current = fieldId;
        prevTypesRef.current = [...componentTypes];
    }

    // Memoize the getIdentifier function so it doesn't change on every render
    const getIdentifier = useCallback(
        (componentType?: string) => {
            if (!state.identifierMap) {
                throw new Error("Broker identifiers have not been initialized yet");
            }
            const identifier = state.identifierMap.get(componentType);
            if (!identifier) {
                return state.identifierMap.get(undefined)!;
            }
            return identifier;
        },
        [state.identifierMap]
    );

    useEffect(() => {
        // Skip if this effect has already been run for the current dependencies
        if (effectRanRef.current) return;

        const baseConfig = {
            source: "preview",
            count: 1 + componentTypes.length,
            idPattern: (index: number) => {
                if (index === 0) return fieldId;
                return `${fieldId}-${componentTypes[index - 1]}`;
            },
        };

        dispatch(createTempBrokerMappings(baseConfig))
            .unwrap()
            .then((result) => {
                // Only proceed if we're still mounted with the same dependencies
                if (prevFieldIdRef.current !== fieldId || JSON.stringify(prevTypesRef.current) !== JSON.stringify(componentTypes)) {
                    return;
                }

                // Create the map of identifiers
                const newMap = new Map<string | undefined, BrokerIdentifier>();
                newMap.set(undefined, result.identifiers[0]);

                componentTypes.forEach((type, index) => {
                    newMap.set(type, result.identifiers[index + 1]);
                });

                // Update all state in one go to prevent multiple renders
                setState({
                    sourceId: result.sourceId,
                    identifierMap: newMap,
                    isComplete: true,
                });

                // Mark that this effect has run for these dependencies
                effectRanRef.current = true;
            });
    }, [dispatch, fieldId, componentTypes]);

    // Don't return anything until everything is ready
    if (!state.sourceId || !state.identifierMap || !state.isComplete) {
        return null;
    }

    // Return an object with the memoized getIdentifier function
    return {
        sourceId: state.sourceId,
        getIdentifier,
        isComplete: state.isComplete,
    };
}

// New combined hook for fields with brokers
export function useFieldsWithBrokers(
    fields: Partial<FieldDefinition> | Partial<FieldDefinition>[],
    source: string = "test-source",
    sourceId: string = "test-source-1",
    idPattern?: (index: number) => string,
    brokerIdPattern?: (index: number) => string
) {

    const fieldArray = Array.isArray(fields) ? fields : [fields];
    const normalizedFields: FieldDefinition[] = fieldArray.map(field => {
        return normalizeFieldDefinitionWithUuid(field as Partial<FieldDefinition>);
    });
    
    const dispatch = useAppDispatch();
    const [result, setResult] = useState<{
        source: string;
        sourceId: string;
        fields: FieldDefinition[];
    } | null>(null);
    
    const count = normalizedFields.length;
    
    useEffect(() => {
        if (!normalizedFields.length) return;
        
        dispatch(
            createTempBrokerMappings({
                source,
                count,
                sourceId,
                idPattern,
                brokerIdPattern,
            })
        )
            .unwrap()
            .then((brokerResult) => {
                // Create normalized fields with IDs from broker mappings
                const normalizedFieldsWithIds = normalizedFields.map((field, index) => {
                    const identifier = brokerResult.identifiers[index];
                    const fieldWithId = {
                        ...field,
                        id: identifier.mappedItemId,
                    };
                    return normalizeFieldDefinition(fieldWithId);
                });
                
                setResult({
                    source,
                    sourceId: brokerResult.sourceId,
                    fields: normalizedFieldsWithIds,
                });
            });
    }, [dispatch, source, count, JSON.stringify(fields), sourceId, idPattern, brokerIdPattern]);
    
    return result;
}
