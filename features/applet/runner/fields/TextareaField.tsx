import React from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectBrokerValue, updateBrokerValue } from "@/lib/redux/app-runner/slices/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { FieldDefinition } from "@/types/customAppTypes";


const TextareaField: React.FC<{
    field: FieldDefinition;
    isMobile?: boolean;
    source?: string;
    disabled?: boolean;
    className?: string; // Add this new prop
}> = ({ field, isMobile, source="applet", disabled=false, className="" }) => {
    const { id, placeholder, componentProps } = field;
    const { 
        rows,
        maxLength,
        width,
        spellCheck,
        customContent
    } = componentProps;
    
    const safeWidthClass = ensureValidWidthClass(width);
    
    const dispatch = useAppDispatch();
    const value = useAppSelector((state) => selectBrokerValue(state, source, id));
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        dispatch(
            updateBrokerValue({
                source: source,
                itemId: id,
                value: e.target.value,
            })
        );
    };
    
    const textareaClassName =
        "w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-inherit placeholder-gray-400 dark:placeholder-gray-400 placeholder-text-xs";
    
    const resizeStyle = { resize: "vertical" } as React.CSSProperties;
    
    if (customContent) {
        return <>{customContent}</>;
    }
    
    return (
        <div className={`${safeWidthClass} ${className}`}>
            <textarea
                id={`${id}-textarea`}
                className={textareaClassName}
                value={value ?? ""}
                onChange={handleChange}
                placeholder={placeholder}
                rows={rows}
                maxLength={maxLength}
                spellCheck={spellCheck}
                style={resizeStyle}
                disabled={disabled}
            />
        </div>
    );
};

export default TextareaField;