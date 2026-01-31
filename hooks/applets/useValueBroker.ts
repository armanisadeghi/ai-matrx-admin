"use client";

import { useUser } from "@/lib/hooks/useUser";
import { useCallback, useEffect, useState } from "react";
import { useAppDispatch, useEntityTools } from "@/lib/redux";
import { DataBrokerRecordWithKey } from "@/types/AutomationSchemaTypes";
import { v4 as uuidv4 } from "uuid";
import { useThrottle } from "@uidotdev/usehooks";
import { useGetOrFetchRecord } from "@/app/entities/hooks/records/useGetOrFetch";

const DEBUG_MODE = false;

export const useValueBroker = (brokerId: string) => {
    const dispatch = useAppDispatch();
    const { actions, selectors } = useEntityTools("brokerValue");
    const [tempId, setTempId] = useState<string | null>(null);

    useEffect(() => {
        setTempId(uuidv4());
    }, []);

    const tempRecordId = `new-record-${tempId}`;

    const broker = useGetOrFetchRecord({ entityName: "dataBroker", simpleId: brokerId }) as DataBrokerRecordWithKey;

    const brokerDataType = broker?.dataType || "str";

    const [localValue, setLocalValue] = useState<any>(null);
    const throttledValue = useThrottle(localValue, 1000);

    const [isInitialized, setIsInitialized] = useState(false);
    const { userId } = useUser();

    useEffect(() => {
        if (!broker) return;
        if (!userId) return;
        dispatch(
            actions.startCreateWithInitialData({
                tempId: tempRecordId,
                initialData: {
                    userId,
                    dataBroker: broker.id,
                    data: { value: broker.defaultValue },
                },
            })
        );
        setIsInitialized(true);
    }, [broker, dispatch, actions, userId]);

    useEffect(() => {
        if (throttledValue === null || !isInitialized) return;

        const dataValue = { value: throttledValue };
        dispatch(
            actions.updateUnsavedField({
                recordId: tempRecordId,
                field: "data",
                value: dataValue,
            })
        );
    }, [throttledValue, dispatch, actions, isInitialized]);

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

    if (DEBUG_MODE) {
        printDebug(broker, localValue, isInitialized);
    }

    return {
        currentValue: localValue,
        setValue,
    };
};

const printDebug = (broker, localValue, isInitialized) => {
    console.log("--------------------------------");
    console.log("Broker Name", broker?.name);
    console.log("Broker Id", broker?.id);
    console.log("broker", broker);
    console.log("localValue", localValue);
    console.log("isInitialized", isInitialized);
    console.log("--------------------------------");
};
