import React, { useEffect, useRef } from "react";
import MobileSearchField from "../field/MobileSearchField";
import { FieldDefinition } from "@/types";
import { fieldController } from "../../field-components/FieldController";
import TruncatedHelpText from "../common/TruncatedHelpText";

interface MobileSearchGroupFieldProps {
    id: string;
    label: string;
    description?: string;
    fields: FieldDefinition[];
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
            if (!fieldRefs.current.has(field.id)) {
                fieldRefs.current.set(field.id, fieldController(field, true));
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
            label={label}
            description={description}
            fields={fields}
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
                        <div key={field.id} className="mb-6 last:mb-0">
                            <label className="block text-sm font-medium mb-3 text-gray-900 dark:text-gray-100">{field.label}</label>
                            <div className="mb-2">
                                {/* Directly render the saved component */}
                                {fieldRefs.current.get(field.id)}
                            </div>
                            {field.helpText && (
                                <TruncatedHelpText text={field.helpText} maxWidth="100%" className="mt-1" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </MobileSearchField>
    );
};

export default MobileSearchGroupField;
