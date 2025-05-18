import React from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { brokerSelectors, brokerActions } from "@/lib/redux/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { FieldDefinition } from "@/types/customAppTypes";

const InputField: React.FC<{
    field: FieldDefinition;
    appletId: string;
    isMobile?: boolean;
    source?: string;
    disabled?: boolean;
    className?: string; // Add this new prop
}> = ({ field, appletId, isMobile, source="applet", disabled=false, className="" }) => {
    const { id, label, placeholder, required, componentProps } = field;
    const { 
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
    
    // Use a default input type if not provided
    const inputType = "text";
    
    const safeWidthClass = ensureValidWidthClass(width);
    
    const dispatch = useAppDispatch();
    const brokerId = useAppSelector((state) => brokerSelectors.selectBrokerId(state, { source, mappedItemId: id }));
    const stateValue = useAppSelector((state) => brokerSelectors.selectValue(state, brokerId));
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(
            brokerActions.setValue({
                brokerId,
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
        <div className={`${safeWidthClass} ${className}`}>
            {valuePrefix && (
                <span className="text-gray-500 dark:text-gray-400 mr-1">{valuePrefix}</span>
            )}
            <input
                id={`${id}-input`}
                className={inputClassName}
                type={inputType}
                value={stateValue ?? ""}
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