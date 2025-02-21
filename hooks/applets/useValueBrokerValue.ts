"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppDispatch, useEntityTools } from "@/lib/redux";
import { useThrottle } from "@uidotdev/usehooks";

const convertValue = (value: any, dataType: string): any => {
    switch (dataType) {
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


const DEBUG_MODE = false;

export const useValueBrokerValue = (tempId: string, dataType: string = 'str') => {
    const dispatch = useAppDispatch();
    const { actions, selectors } = useEntityTools("brokerValue");
    const [localValue, setLocalValue] = useState<any>(null);
    
    const throttledValue = useThrottle(localValue, 1000);


    useEffect(() => {
        if (throttledValue === null) return;

        const dataValue = { value: throttledValue };
        dispatch(
            actions.updateUnsavedField({
                recordId: tempId,
                field: "data",
                value: dataValue,
            })
        );
    }, [throttledValue, dispatch, actions]);


    const setValue = useCallback(
        (newValue: any) => {
            const convertedValue = convertValue(newValue, dataType);
            setLocalValue(convertedValue);
        },
        [dataType]
    );

    return {
        currentValue: localValue,
        setValue,
    };
};
