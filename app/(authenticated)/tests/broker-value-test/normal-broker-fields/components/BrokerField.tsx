// app/(authenticated)/tests/broker-value-test/normal-broker-fields/components/BrokerField.tsx
"use client";

import React, { ReactElement } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { brokerConceptActions, brokerConceptSelectors, BrokerIdentifier } from "@/lib/redux/brokerSlice";

// ============================================
// Core BrokerField Types and Interfaces
// ============================================

export interface BrokerFieldProps<T = any> {
    value: T;
    onChange: (value: T) => void;
    disabled?: boolean;
}

export interface BrokerFieldConfig<T = any> {
    broker: BrokerIdentifier;
    type?: "text" | "number" | "boolean" | "options" | "table" | "dynamic";
    defaultValue?: T;
    disabled?: boolean;
    transformer?: {
        fromBroker?: (brokerValue: any) => T;
        toBroker?: (componentValue: T) => any;
    };
}

// ============================================
// Main BrokerField Component
// ============================================

type BrokerFieldRenderProps<T> = {
    children: (props: BrokerFieldProps<T>) => ReactElement;
} & BrokerFieldConfig<T>;

export function BrokerField<T = any>({
    broker,
    type = "dynamic",
    defaultValue,
    disabled = false,
    transformer,
    children,
}: BrokerFieldRenderProps<T>) {
    const dispatch = useAppDispatch();

    const brokerValue = useAppSelector((state) => {
        switch (type) {
            case "text":
                return brokerConceptSelectors.selectText(state, broker);
            case "number":
                return brokerConceptSelectors.selectNumber(state, broker);
            case "boolean":
                return brokerConceptSelectors.selectBoolean(state, broker);
            case "options":
                return brokerConceptSelectors.selectBrokerOptions(state, broker);
            case "table":
                return brokerConceptSelectors.selectTable(state, broker);
            default:
                return brokerConceptSelectors.selectValueWithoutBrokerId(state, broker);
        }
    });

    const value = transformer?.fromBroker ? transformer.fromBroker(brokerValue) : brokerValue ?? defaultValue;

    const handleChange = (newValue: T) => {
        const valueToStore = transformer?.toBroker ? transformer.toBroker(newValue) : newValue;

        switch (type) {
            case "text":
                dispatch(
                    brokerConceptActions.setText({
                        idArgs: broker,
                        text: valueToStore as string,
                    })
                );
                break;
            case "number":
                dispatch(
                    brokerConceptActions.setNumber({
                        idArgs: broker,
                        value: valueToStore as number,
                    })
                );
                break;
            case "boolean":
                dispatch(
                    brokerConceptActions.setBoolean({
                        idArgs: broker,
                        value: valueToStore as boolean,
                    })
                );
                break;
            case "options":
                dispatch(
                    brokerConceptActions.setOptions({
                        idArgs: broker,
                        options: valueToStore as any,
                    })
                );
                break;
            case "table":
                dispatch(
                    brokerConceptActions.setTable({
                        idArgs: broker,
                        table: valueToStore as any,
                    })
                );
                break;
            default:
                dispatch(
                    brokerConceptActions.setValueWithoutBrokerId({
                        idArgs: broker,
                        value: valueToStore,
                    })
                );
        }
    };

    return children({
        value,
        onChange: handleChange,
        disabled,
    });
}

// Higher-order component for easier use with component instances
interface WithBrokerProps<T = any> extends BrokerFieldConfig<T> {
    children: ReactElement;
}

export function WithBroker<T = any>({ children, broker, type, defaultValue, disabled, transformer }: WithBrokerProps<T>) {
    return (
        <BrokerField<T> broker={broker} type={type} defaultValue={defaultValue} disabled={disabled} transformer={transformer}>
            {(brokerProps) => {
                // Cast children.props to a Record to make TypeScript happy
                const childProps = children.props as Record<string, any>;

                // Merge props while preserving type safety
                const mergedProps = {
                    ...childProps,
                    value: brokerProps.value,
                    onChange: brokerProps.onChange,
                    disabled: brokerProps.disabled || childProps.disabled,
                };

                return React.cloneElement(children, mergedProps);
            }}
        </BrokerField>
    );
}
