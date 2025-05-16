"use client";
// For the stepper layout
import React from "react";
import { ContainerRenderProps } from "../AppletLayoutManager";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppletRuntimeContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import FieldsWithLabels from "@/features/applet/runner/fields/core/FieldsWithlabels";

const StepperSearchGroup: React.FC<ContainerRenderProps> = ({
    id,
    label,
    description,
    fields,
    isMobile = false,
    appletId,
    source,
    hideFieldLabels = false,
}) => {
    const appletContainers = useAppSelector((state) => selectAppletRuntimeContainers(state, appletId));
    
    return (
        <div className="w-full">
            <FieldsWithLabels
                fields={fields}
                appletId={appletId}
                isMobile={isMobile}
                source={source}
                wrapperClassName="mb-5 last:mb-0"
                showLabels={!hideFieldLabels}
                showHelpText={true}
                showRequired={true}
                labelPosition="top"
                labelClassName="mb-2"
            />
        </div>
    );
};

export default StepperSearchGroup;