import React, { ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectBrokerValue, updateBrokerValue } from "@/lib/redux/app-runner/slices/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { ComponentType } from "@/types/customAppTypes";

interface FieldOption {
    id: string;
    label: string;
    description?: string;
    helpText?: string;
    iconName?: string;
}

interface ComponentProps {
    min?: number;
    max?: number;
    step?: number;
    rows?: number;
    minDate?: string;
    maxDate?: string;
    onLabel?: string;
    offLabel?: string;
    multiSelect?: boolean;
    maxItems?: number;
    minItems?: number;
    gridCols?: number;
    autoComplete?: string;
    direction?: "vertical" | "horizontal";
    customContent?: ReactNode;
    showSelectAll?: boolean;
    width?: string;
    valuePrefix?: string;
    valueSuffix?: string;
    maxLength?: number;
    spellCheck?: boolean;
    type?: string;
}

interface FieldDefinition {
    id: string;
    label: string;
    description?: string;
    helpText?: string;
    group?: string;
    iconName?: string;
    component: ComponentType;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
    defaultValue?: any;
    options?: FieldOption[];
    componentProps: ComponentProps;
    includeOther?: boolean;
}

const InputField: React.FC<{
    field: FieldDefinition;
    appletId: string;
    isMobile?: boolean;
}> = ({ field, appletId, isMobile }) => {
    const { id, label, placeholder = "", required, disabled, componentProps = {} } = field;
    const { 
        type = "text",
        maxLength,
        min,
        max,
        step,
        autoComplete,
        width,
        valuePrefix,
        valueSuffix,
        customContent
    } = componentProps;
    
    const safeWidthClass = ensureValidWidthClass(width);
    
    const dispatch = useAppDispatch();
    const value = useAppSelector((state) => selectBrokerValue(state, "applet", id));
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(
            updateBrokerValue({
                source: "applet",
                itemId: id,
                value: e.target.value,
            })
        );
    };
    
    const inputClassName =
        "w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-400 placeholder-text-xs";
    
    if (customContent) {
        return <>{customContent}</>;
    }
    
    return (
        <div className={`${safeWidthClass}`}>
            {valuePrefix && (
                <span className="text-gray-500 dark:text-gray-400 mr-1">{valuePrefix}</span>
            )}
            <input
                id={`${id}-input`}
                className={inputClassName}
                type={type}
                value={value ?? ""}
                onChange={handleChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                maxLength={maxLength}
                min={min}
                max={max}
                step={step}
                autoComplete={autoComplete}
            />
            {valueSuffix && (
                <span className="text-gray-500 dark:text-gray-400 ml-1">{valueSuffix}</span>
            )}
        </div>
    );
};

export default InputField; 