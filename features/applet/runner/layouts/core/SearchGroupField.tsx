// File: features\applet\layouts\core\SearchGroupField.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { AppletFieldController } from "@/features/applet/runner/fields/AppletFieldController";
import SearchField from "@/features/applet/runner/layouts/core/SearchField";
import { CustomFieldLabelAndHelpText } from "@/constants/app-builder-help-text";
import { ContainerRenderProps } from "@/features/applet/runner/layouts/AppletLayoutManager";

const SearchGroupField: React.FC<ContainerRenderProps> = ({
    id,
    label,
    appletId,
    description,
    fields,
    isActive,
    onClick,
    onOpenChange,
    isLast = false,
    actionButton,
    className = "",
    isMobile = false,
    hideContainerPlaceholder = false,
    source = "applet",
}) => {
    const fieldRefs = useRef<Map<string, React.ReactNode>>(new Map());

    useEffect(() => {
        fields.forEach((field) => {
            if (!fieldRefs.current.has(field.id)) {
                fieldRefs.current.set(field.id, AppletFieldController({ field, appletId, isMobile, source }));
            }
        });
    }, [fields, isMobile]);

    return (
        <SearchField
            id={id}
            label={label}
            appletId={appletId}
            fields={fields}
            description={description}
            isActive={isActive}
            onClick={onClick}
            onOpenChange={onOpenChange}
            isLast={isLast}
            actionButton={isLast ? actionButton : undefined}
            className={className}
            isMobile={isMobile}
            hideContainerPlaceholder={hideContainerPlaceholder}
            source={source}
        >
            <div className="w-full min-w-96 p-4 bg-white rounded-xl dark:bg-gray-800 border dark:border-gray-700">
                <h3 className="text-lg text-rose-500 font-medium mb-1">{label}</h3>

                <div className="pr-1 pt-1 mb-5 text-xs text-gray-500 dark:text-gray-400">{description}</div>
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
                            {fieldRefs.current.get(field.id)}
                        </div>
                    ))}
                </div>
            </div>
        </SearchField>
    );
};

export default SearchGroupField;
