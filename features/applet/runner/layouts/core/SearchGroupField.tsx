"use client";
import React from "react";
import SearchField from "@/features/applet/runner/layouts/core/SearchField";
import { ContainerRenderProps } from "@/features/applet/runner/layouts/AppletLayoutManager";
import FieldsWithLabels from "@/features/applet/runner/fields/core/FieldsWithLabels";

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
                
                <FieldsWithLabels
                    fields={fields}
                    appletId={appletId}
                    isMobile={isMobile}
                    source={source}
                    wrapperClassName="mb-5 last:mb-0"
                    showLabels={true}
                    showHelpText={true}
                    showRequired={true}
                    labelPosition="top"
                    labelClassName="mb-2"
                />
            </div>
        </SearchField>
    );
};

export default SearchGroupField;