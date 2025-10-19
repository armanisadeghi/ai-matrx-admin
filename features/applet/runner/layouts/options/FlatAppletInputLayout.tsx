// File: features/applet/runner/layouts/options/FlatAppletInputLayout.tsx
import React from "react";
import { AppletInputProps } from "@/features/applet/runner/layouts/AppletLayoutManager";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppletRuntimeContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import FieldsWithLabels from "@/features/applet/runner/fields/core/FieldsWithlabels";

const FlatAppletInputLayout: React.FC<AppletInputProps> = ({
    appletId,
    actionButton,
    className = "",
    isMobile = false,
    source = "applet",
}) => {
    const appletContainers = useAppSelector((state) => selectAppletRuntimeContainers(state, appletId));
    
    return (
        <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
            <div className="border rounded-lg bg-textured dark:border-gray-700 p-6">
                {appletContainers.map((container, groupIndex) => (
                    <div key={container.id} className="mb-8">
                        {/* Group header with minimal padding */}
                        {appletContainers.length > 1 && (
                            <div className="mb-4">
                                <h4 className="text-lg font-medium text-rose-500 dark:text-rose-400">{container.label}</h4>
                                {container.description && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{container.description}</p>
                                )}
                            </div>
                        )}
                        {/* Group fields */}
                        <div className="grid grid-cols-1 gap-y-6">
                            <FieldsWithLabels
                                fields={container.fields}
                                sourceId={appletId}
                                isMobile={isMobile}
                                source={source}
                                wrapperClassName="mb-0" // Override the default margin
                                showLabels={true}
                                showHelpText={true}
                                showRequired={true}
                                labelPosition="top"
                            />
                        </div>
                        {/* Add a subtle divider between groups if not the last container */}
                        {groupIndex < appletContainers.length - 1 && (
                            <div className="border-b-3 border-gray-200 dark:border-gray-700 mt-8"></div>
                        )}
                    </div>
                ))}
                <div className="flex justify-end mt-8">{actionButton}</div>
            </div>
        </div>
    );
};

export default FlatAppletInputLayout;