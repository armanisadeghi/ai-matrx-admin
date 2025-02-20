"use client";

import { useUser } from "@/lib/hooks/useUser";
import { useCallback, useEffect, useState, useRef } from "react";
import { useAppDispatch, useAppSelector, useEntityTools } from "@/lib/redux";
import { DataBrokerRecordWithKey } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { useThrottle } from "@uidotdev/usehooks";
import { useGetOrFetchRecord } from "@/app/entities/hooks/records/useGetOrFetch";

export const useValueBroker = (brokerId: string) => {
    const dispatch = useAppDispatch();
    const { actions, selectors } = useEntityTools("brokerValue");
    const { userId } = useUser();

    // Move UUID generation inside the hook function to ensure each instance gets a unique ID
    const [tempId] = useState(() => uuidv4());
    const [tempIdKey] = useState(() => `new-record-${tempId}`);

    const broker = useGetOrFetchRecord({ entityName: "dataBroker", simpleId: brokerId }) as DataBrokerRecordWithKey;
    const brokerDataType = broker?.dataType || "str";

    const [localValue, setLocalValue] = useState<any>(null);
    const throttledValue = useThrottle(localValue, 1000);

    const [initialData, setInitialData] = useState<any>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    
    // Track if we've already dispatched the creation action
    const hasDispatchedCreation = useRef(false);

    useEffect(() => {
        if(isInitialized) return;
        console.log("useEffect", broker, userId);
        if (!broker || !userId) return;
        console.log("useEffect After check", broker, userId);

        setLocalValue(broker.defaultValue);
        setInitialData({
            id: tempId,
            userId,
            dataBroker: broker.id,
            data: { value: broker.defaultValue },
        });

        setIsInitialized(true);
    }, [broker, userId, tempId, isInitialized]);

    useEffect(() => {
        if (!initialData || hasDispatchedCreation.current) return;

        dispatch(
            actions.startRecordCreationWithData({
                tempId: tempIdKey,
                initialData,
            })
        );
        
        hasDispatchedCreation.current = true;
    }, [initialData, dispatch, actions, tempIdKey]);

    useEffect(() => {
        if (throttledValue === null || !isInitialized) return;

        const dataValue = { value: throttledValue };
        dispatch(
            actions.updateUnsavedField({
                recordId: tempIdKey,
                field: "data",
                value: dataValue,
            })
        );
    }, [throttledValue, dispatch, actions, isInitialized, tempIdKey]);

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

    const setValue = useCallback(
        (newValue: any) => {
            const convertedValue = convertValue(newValue);
            setLocalValue(convertedValue);
        },
        [brokerDataType]
    );

    const valueBrokerRecords = useAppSelector((state) => selectors.selectAllEffectiveRecordsWithKeys(state));
    
    console.log("--------------------------------");
    console.log("valueBrokerRecords", valueBrokerRecords);
    console.log("User ID", userId);
    console.log("Initial Data", initialData);
    console.log("ID", tempIdKey);
    console.log("Broker Name", broker?.name);
    console.log("localValue", localValue);
    console.log("--------------------------------");

    return {
        currentValue: localValue,
        setValue,
    };
};