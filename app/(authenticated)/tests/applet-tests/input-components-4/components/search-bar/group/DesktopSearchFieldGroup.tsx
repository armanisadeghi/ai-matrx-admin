// SearchGroupField.tsx
import React, { useEffect, useRef } from "react";
import { GroupFieldConfig } from "../../field-components/types";
import { fieldController } from "../../field-components/FieldController";
import DesktopSearchField from "../field/DesktopSearchField";

interface SearchGroupFieldProps {
    id: string;
    label: string;
    placeholder: string;
    description?: string;
    fields: GroupFieldConfig[];
    isActive: boolean;
    onClick: (id: string) => void;
    onOpenChange: (open: boolean) => void;
    isLast?: boolean;
    actionButton?: React.ReactNode;
    className?: string;
    isMobile?: boolean;
}

const DesktopSearchGroup: React.FC<SearchGroupFieldProps> = ({
    id,
    label,
    placeholder,
    description,
    fields,
    isActive,
    onClick,
    onOpenChange,
    isLast = false,
    actionButton,
    className = "",
    isMobile = false,
}) => {
    const fieldRefs = useRef<Map<string, React.ReactNode>>(new Map());

    useEffect(() => {
        fields.forEach((field) => {
            if (!fieldRefs.current.has(field.brokerId)) {
                fieldRefs.current.set(field.brokerId, fieldController(field, isMobile));
            }
        });
    }, [fields]);

    return (
        <DesktopSearchField
            id={id}
            label={label}
            placeholder={placeholder}
            isActive={isActive}
            onClick={onClick}
            onOpenChange={onOpenChange}
            isLast={isLast}
            actionButton={isLast ? actionButton : undefined}
            className={className}
            isMobile={isMobile}
        >
            <div className="w-full min-w-96 p-2 bg-white rounded-xl dark:bg-gray-800 border dark:border-gray-700">
                <h3 className="text-lg text-rose-500 font-medium mb-1">{label}</h3>
                <div className="pr-1 mb-5 text-sm text-gray-500 dark:text-gray-400">{description}</div>
                <div>
                    {fields.map((field) => (
                        <div key={field.brokerId} className="mb-6 last:mb-0">
                            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">{field.label}</label>
                            {/* Directly render the saved component */}
                            {fieldRefs.current.get(field.brokerId)}
                            {field.helpText && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>}
                        </div>
                    ))}
                </div>
            </div>
        </DesktopSearchField>
    );
};

export default DesktopSearchGroup;
