"use client";

import React, { useEffect, useState } from "react";
import {
    GroupFieldConfig,
    TabSearchConfig,
    SelectFieldConfig,
    ButtonFieldConfig,
    TextareaFieldConfig,
    InputFieldConfig,
    SelectField,
    ButtonField,
    TextareaField,
    InputField,
} from "./field-components";

interface FieldControllerProps {
    config: TabSearchConfig;
    activeTab: string;
}

const FieldController: React.FC<FieldControllerProps> = ({ config, activeTab }) => {
    const [mountedFields, setMountedFields] = useState<React.ReactNode[]>([]);

    // On mount, create all field components
    useEffect(() => {
        // Collect all fields from all groups
        const allFields: GroupFieldConfig[] = [];
        Object.values(config).forEach((groups) => {
            groups.forEach((group) => {
                group.fields.forEach((field) => {
                    allFields.push(field);
                });
            });
        });

        // Create React components for all fields
        const fieldComponents = allFields.map((field) => {
            const commonProps = {
                key: field.brokerId,
                id: field.brokerId,
                label: field.label,
                placeholder: field.placeholder || "",
                customConfig: field.customConfig,
            };

            let component;
            switch (field.type) {
                case "select":
                    component = <SelectField {...commonProps} customConfig={commonProps.customConfig as SelectFieldConfig} />;
                    break;
                case "button":
                    component = <ButtonField {...commonProps} customConfig={commonProps.customConfig as ButtonFieldConfig} />;
                    break;
                case "textarea":
                    component = <TextareaField {...commonProps} customConfig={commonProps.customConfig as TextareaFieldConfig} />;
                    break;
                case "date":
                    component = <InputField {...commonProps} customConfig={{ type: "date", ...field.customConfig }} />;
                    break;
                case "number":
                    component = <InputField {...commonProps} customConfig={{ type: "number", ...field.customConfig }} />;
                    break;
                default:
                    component = <InputField {...commonProps} customConfig={commonProps.customConfig as InputFieldConfig} />;
            }

            // After render, move the component to its mount point
            useEffect(() => {
                const mountPoint = document.getElementById(`mount-point-${field.brokerId}`);
                const renderedComponent = document.getElementById(`field-component-${field.brokerId}`);

                if (mountPoint && renderedComponent) {
                    mountPoint.appendChild(renderedComponent);
                }
            }, [field.brokerId]);

            return (
                <div key={field.brokerId} id={`field-component-${field.brokerId}`} className="field-component">
                    {component}
                </div>
            );
        });

        setMountedFields(fieldComponents);
    }, [config]);

    return (
        <div style={{ display: "none" }} id="field-components-container">
            {mountedFields}
        </div>
    );
};

export default FieldController;
