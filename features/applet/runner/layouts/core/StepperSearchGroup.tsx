// File: features\applet\layouts\core\StepperSearchGroup.tsx
"use client";
// For the stepper layout
import React, { useEffect, useRef } from "react";
import { ContainerRenderProps } from "./AppletInputLayoutManager";
import { fieldController } from "../../field-components/FieldController";

const StepperSearchGroup: React.FC<ContainerRenderProps> = ({ id, label, description, fields, isMobile = false }) => {
    const fieldRefs = useRef<Map<string, React.ReactNode>>(new Map());

    useEffect(() => {
        fields.forEach((field) => {
            if (!fieldRefs.current.has(field.id)) {
                fieldRefs.current.set(field.id, fieldController(field));
            }
        });
    }, [fields, isMobile]);

    return (
        <div className="w-full">
            {fields.map((field) => (
                <div key={field.id} className="mb-6 last:mb-0">
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">{field.label}</label>
                    {fieldRefs.current.get(field.id)}
                    {field.helpText && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>}
                </div>
            ))}
        </div>
    );
};

export default StepperSearchGroup;
