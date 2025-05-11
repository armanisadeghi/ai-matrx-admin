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


const TextareaField: React.FC<{
    field: FieldDefinition;
    appletId: string;
    isMobile?: boolean;
}> = ({ field, appletId, isMobile }) => {
    const { id, label, placeholder = "", componentProps = {} } = field;
    const { 
        rows,
        maxLength,
        width,
        spellCheck,
        customContent
    } = componentProps;
    
    const safeWidthClass = ensureValidWidthClass(width);
    
    const dispatch = useAppDispatch();
    const value = useAppSelector((state) => selectBrokerValue(state, "applet", id));
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        dispatch(
            updateBrokerValue({
                source: "applet",
                itemId: id,
                value: e.target.value,
            })
        );
    };
    
    const textareaClassName =
        "w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-400 placeholder-text-xs";
    
    const resizeStyle = { resize: "vertical" } as React.CSSProperties;
    
    if (customContent) {
        return <>{customContent}</>;
    }
    
    return (
        <div className={`${safeWidthClass}`}>
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
            />
        </div>
    );
};

export default TextareaField;