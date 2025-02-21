import React, { useEffect, useRef } from "react";
import MobileSearchField from "../field/MobileSearchField";
import { GroupFieldConfig } from "../../field-components/types";
import { fieldController } from "../../field-components/FieldController";
import TruncatedHelpText from "../common/TruncatedHelpText";

interface MobileSearchGroupFieldProps {
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
    preventClose?: boolean;
    isMobile?: boolean;
}

const MobileSearchGroupField: React.FC<MobileSearchGroupFieldProps> = ({
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
    preventClose = true,
}) => {
    const fieldRefs = useRef<Map<string, React.ReactNode>>(new Map());

    useEffect(() => {
        fields.forEach((field) => {
            if (!fieldRefs.current.has(field.brokerId)) {
                fieldRefs.current.set(field.brokerId, fieldController(field, true));
            }
        });
    }, [fields]);

    const handleContentClick = (e: React.MouseEvent) => {
        if (preventClose) {
            e.stopPropagation();
        }
    };

    return (
        <MobileSearchField
            id={id}
            groupLabel={label}
            groupDescription={description}
            groupPlaceholder={placeholder}
            isActive={isActive}
            onClick={onClick}
            onOpenChange={onOpenChange}
            isLast={isLast}
            actionButton={undefined}
            className={className}
            preventClose={preventClose}
        >
            <div className="w-full p-6 bg-white dark:bg-gray-800" onClick={handleContentClick}>
                <div>
                    {fields.map((field) => (
                        <div key={field.brokerId} className="mb-6 last:mb-0">
                            <label className="block text-sm font-medium mb-3 text-gray-900 dark:text-gray-100">{field.label}</label>
                            <div className="mb-2">
                                {/* Directly render the saved component */}
                                {fieldRefs.current.get(field.brokerId)}
                            </div>
                            {field.customConfig.helpText && (
                                <TruncatedHelpText text={field.customConfig.helpText} maxWidth="100%" className="mt-1" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </MobileSearchField>
    );
};

export default MobileSearchGroupField;
