"use client";

import { useUser } from "@/lib/hooks/useUser";
import { useCallback, useEffect, useState, useRef } from "react";
import { useAppDispatch, useAppSelector, useEntityTools } from "@/lib/redux";
import { DataBrokerRecordWithKey } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import { useThrottle } from "@uidotdev/usehooks";

export const useValueBroker = (brokerId: string) => {
    const dispatch = useAppDispatch();
    const { actions: brokerValueActions } = useEntityTools("brokerValue");
    const { selectors: brokerSelectors } = useEntityTools("dataBroker");
    
    const tempIdRef = useRef(uuidv4());
    const tempIdKeyRef = useRef(`new-record-${tempIdRef.current}`);

    const broker = useAppSelector((state) => 
        brokerSelectors.selectRecordWithKey(state, `id:${brokerId}`)
    ) as DataBrokerRecordWithKey;
    
    const brokerDataType = broker?.dataType || "str";

    const [localValue, setLocalValue] = useState<any>(null);
    const throttledValue = useThrottle(localValue, 1000);
    
    const [initialData, setInitialData] = useState<any>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const { userId } = useUser();

    useEffect(() => {
        if (!broker || isInitialized) return;
        
        setLocalValue(broker.defaultValue);
        setInitialData({
            id: tempIdRef.current,
            userId,
            dataBroker: broker.id,
            data: { value: broker.defaultValue },
        });
        
        setIsInitialized(true);
    }, [broker, userId, isInitialized]);

    useEffect(() => {
        if (!initialData) return;
        
        dispatch(brokerValueActions.startRecordCreationWithData({
            tempId: tempIdKeyRef.current,
            initialData,
        }));
    }, [initialData, dispatch, brokerValueActions]);

    useEffect(() => {
        if (throttledValue === null || !isInitialized) return;
        
        const dataValue = { value: throttledValue };
        dispatch(
            brokerValueActions.updateUnsavedField({
                recordId: tempIdKeyRef.current,
                field: "data",
                value: dataValue,
            })
        );
    }, [throttledValue, dispatch, brokerValueActions, isInitialized]);

    const convertValue = (value: any): any => {
        switch (brokerDataType) {
            case "bool":
                return Boolean(value);
            case "int":
                return parseInt(value);
            case "float":
                return parseFloat(value);
            case "list":
                return Array.isArray(value) ? value : [value];
            case "dict":
                return typeof value === "object" ? value : {};
            default:
                return String(value);
        }
    };

    const setValue = useCallback((newValue: any) => {
        const convertedValue = convertValue(newValue);
        setLocalValue(convertedValue);
    }, [brokerDataType]);
    
    return {
        currentValue: localValue,
        setValue,
    };
};