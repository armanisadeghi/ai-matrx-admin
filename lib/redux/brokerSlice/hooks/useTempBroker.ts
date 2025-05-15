// lib/redux/brokerSlice/hooks/useTempBroker.ts
import { useEffect, useRef, useState } from "react";
import { useAppDispatch } from "@/lib/redux";
import { createTempBroker, createTempBrokerMappings } from "@/lib/redux/brokerSlice/thunks/temp-mapping";
import { BrokerIdentifier } from "@/lib/redux/brokerSlice/types";

// Hook for a single temporary broker
export function useTempBroker(
    source: string,
    options?: {
        sourceId?: string;
        itemId?: string;
        brokerId?: string;
    }
) {
    const dispatch = useAppDispatch();
    const [identifier, setIdentifier] = useState<BrokerIdentifier | null>(null);
    
    useEffect(() => {
        dispatch(createTempBroker({ source, ...options }))
            .unwrap()
            .then(result => {
                setIdentifier(result.identifier);
            });
    }, [dispatch, source, options?.sourceId, options?.itemId, options?.brokerId]);
    
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
        dispatch(createTempBrokerMappings({ 
            source, 
            count, 
            ...options 
        }))
            .unwrap()
            .then(result => {
                setResult({
                    sourceId: result.sourceId,
                    identifiers: result.identifiers
                });
            });
    }, [dispatch, source, count, options?.sourceId]);
    
    return result;
}

// Hook specifically for preview scenarios
export function usePreviewBrokers(fieldId: string, componentTypes: string[]) {
    const dispatch = useAppDispatch();
    const [result, setResult] = useState<{
        sourceId: string;
        getIdentifier: (componentType?: string) => BrokerIdentifier;
    } | null>(null);
    
    useEffect(() => {
        const baseConfig = {
            source: "preview",
            count: 1 + componentTypes.length,
            itemIdPattern: (index: number) => {
                if (index === 0) return fieldId;
                return `${fieldId}-${componentTypes[index - 1]}`;
            }
        };
        
        dispatch(createTempBrokerMappings(baseConfig))
            .unwrap()
            .then(result => {
                const identifierMap = new Map<string | undefined, BrokerIdentifier>();
                identifierMap.set(undefined, result.identifiers[0]);
                
                componentTypes.forEach((type, index) => {
                    identifierMap.set(type, result.identifiers[index + 1]);
                });
                
                setResult({
                    sourceId: result.sourceId,
                    getIdentifier: (componentType?: string) => {
                        return identifierMap.get(componentType) || result.identifiers[0];
                    }
                });
            });
    }, [dispatch, fieldId, componentTypes]);
    
    return result;
}