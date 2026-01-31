"use client";
import { FieldDefinition } from "@/types/customAppTypes";
import React from "react";
import FieldsWithLabels from "@/features/applet/runner/fields/core/FieldsWithlabels";

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
    const showDescription = containerDescriptionLocation === "container-body";

    return (
        <div className="p-4">
            {description && showDescription && (
                <div className="mb-5 text-sm text-gray-500 dark:text-gray-400">{description}</div>
            )}
            <FieldsWithLabels
                fields={fields}
                sourceId={appletId}
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
    );
};

export default ContainerFieldRenderer;