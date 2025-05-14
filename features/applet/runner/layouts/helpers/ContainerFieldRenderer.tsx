"use client";

import { FieldDefinition } from "@/types";
import React, { useEffect, useRef, useState } from "react";
import { fieldController } from "../../field-components/FieldController";
import { CustomFieldLabelAndHelpText } from "@/constants/app-builder-help-text";

interface ContainerFieldRendererProps {
    fields: FieldDefinition[];
    appletId: string;
    description?: string;
    isMobile?: boolean;
    source?: string;
    containerDescriptionLocation?: "container-header" | "container-body";
}

const ContainerFieldRenderer: React.FC<ContainerFieldRendererProps> = ({
    fields,
    appletId,
    description,
    isMobile = false,
    source = "applet",
    containerDescriptionLocation,
}) => {
    // Use state instead of useRef to ensure re-rendering when field components are created
    const [fieldComponents, setFieldComponents] = useState<Map<string, React.ReactNode>>(new Map());

    const showDescription = containerDescriptionLocation === "container-body" ? true : false;

    // Track if mounted to avoid memory leaks
    const isMounted = useRef(true);

    // Initialize field components once when component mounts or fields change
    useEffect(() => {
        // Create a copy to avoid modifying state directly
        const newFieldComponents = new Map(fieldComponents);
        let hasNewComponents = false;

        // Process each field and create components if needed
        fields.forEach((field) => {
            if (!newFieldComponents.has(field.id)) {
                newFieldComponents.set(field.id, fieldController({ field, appletId, isMobile, source }));
                hasNewComponents = true;
            }
        });

        // Only update state if we have new components to avoid unnecessary renders
        if (hasNewComponents && isMounted.current) {
            setFieldComponents(newFieldComponents);
        }

        // Cleanup function for component unmount
        return () => {
            isMounted.current = false;
        };
    }, [fields, isMobile]);

    // Reset mounted flag when component mounts
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    return (
        <div className="p-4">
            {description && showDescription && <div className="mb-5 text-sm text-gray-500 dark:text-gray-400">{description}</div>}
            <div>
                {fields.map((field) => (
                    <div key={field.id} className="mb-5 last:mb-0">
                        <CustomFieldLabelAndHelpText
                            fieldId={field.id}
                            fieldLabel={field.label}
                            helpText={field.helpText}
                            required={field.required}
                            className="mb-2"
                        />
                        {fieldComponents.get(field.id)}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ContainerFieldRenderer;
