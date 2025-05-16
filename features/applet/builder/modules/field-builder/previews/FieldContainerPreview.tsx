"use client";
import React, { useEffect, useRef, useState } from "react";
import { FieldDefinition } from "@/types";
import { AppletFieldController } from "@/features/applet/runner/fields/core/AppletFieldController";
import { getSubmitButton } from "@/features/applet/styles/StyledComponents";
import { CustomFieldLabelAndHelpText } from "@/constants/app-builder-help-text";

export const DEFAULT_CONTAINER_WITHOUT_FIELDS = {
    id: "default-container-without-fields",
    label: "Your Container Label",
    description: "This is the container description or it can be empty",
};

const FieldContainerPreview: React.FC<any> = ({ fields, appletId, source, className = "" }) => {
    const actionButton = getSubmitButton({
        icon: "Send",
        color: "blue",
        size: 24,
    });

    const appletContainers = [
        {
            ...DEFAULT_CONTAINER_WITHOUT_FIELDS,
            fields: fields,
        },
    ];

    return (
        <div className={`w-full max-w-4xl mx-auto p-3 ${className}`}>
            {appletContainers.map((container, index) => (
                <div key={container.id} className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700">
                    {/* SearchContainerHeader inlined */}
                    {container.label && (
                        <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                            <h3 className="text-lg font-bold text-blue-500 dark:text-blue-600 pb-1">{container.label}</h3>
                            {container.description && <p className="text-sm text-gray-500 dark:text-gray-400 pb-0">{container.description}</p>}
                        </div>
                    )}

                    {/* ContainerFieldRenderer inlined */}
                    <ContainerFieldContent
                        fields={container.fields}
                        description={container.description}
                        isMobile={false}
                        source={source}
                        appletId={appletId}
                    />
                </div>
            ))}

            <div className="flex justify-end mt-3">{actionButton}</div>
        </div>
    );

    // Nested component for field rendering
    function ContainerFieldContent({
        fields,
        description,
        appletId,
        isMobile = false,
        source,
    }: {
        fields: FieldDefinition[];
        description?: string;
        appletId: string;
        isMobile?: boolean;
        source: string;
    }) {
        const [fieldComponents, setFieldComponents] = useState<Map<string, React.ReactNode>>(new Map());
        const isMounted = useRef(true);

        useEffect(() => {
            const newFieldComponents = new Map(fieldComponents);
            let hasNewComponents = false;

            fields.forEach((field) => {
                if (!newFieldComponents.has(field.id)) {
                    newFieldComponents.set(field.id, AppletFieldController({ field, appletId, source, isMobile }));
                    hasNewComponents = true;
                }
            });

            if (hasNewComponents && isMounted.current) {
                setFieldComponents(newFieldComponents);
            }

            return () => {
                isMounted.current = false;
            };
        }, [fields, isMobile]);

        useEffect(() => {
            isMounted.current = true;
            return () => {
                isMounted.current = false;
            };
        }, []);

        return (
            <div className="p-4">
                <div>
                    {fields.map((field) => (
                        <div key={field.id} className="mb-6 last:mb-0 space-y-2">
                            <CustomFieldLabelAndHelpText
                                key={field.id}
                                fieldId={field.id}
                                fieldLabel={field.label}
                                helpText={field.helpText}
                                required={field.required}
                            />

                            {fieldComponents.get(field.id)}
                        </div>
                    ))}
                </div>
            </div>
        );
    }
};

export default FieldContainerPreview;
