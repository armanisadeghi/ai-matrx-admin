// File: features\applet\layouts\core\StepperSearchGroup.tsx
"use client";
// For the stepper layout
import React, { useEffect, useRef } from "react";
import { ContainerRenderProps } from "../AppletLayoutManager";
import { fieldController } from "../../field-components/FieldController";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppletRuntimeContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import { CustomFieldLabelAndHelpText } from "@/constants/app-builder-help-text";

const StepperSearchGroup: React.FC<ContainerRenderProps> = ({ id, label, description, fields, isMobile = false, appletId, source }) => {
    const appletContainers = useAppSelector((state) => selectAppletRuntimeContainers(state, appletId));
    const fieldRefs = useRef<Map<string, React.ReactNode>>(new Map());

    useEffect(() => {
        fields.forEach((field) => {
            if (!fieldRefs.current.has(field.id)) {
                fieldRefs.current.set(field.id, fieldController({ field, appletId, isMobile, source }));
            }
        });
    }, [fields, isMobile]);

    return (
        <div className="w-full">
            {fields.map((field) => (
                <div key={field.id} className="mb-5 last:mb-0">
                    <CustomFieldLabelAndHelpText
                        fieldId={field.id}
                        fieldLabel={field.label}
                        helpText={field.helpText}
                        required={field.required}
                        className="mb-2"
                    />
                    {fieldRefs.current.get(field.id)}
                </div>
            ))}
        </div>
    );
};

export default StepperSearchGroup;
