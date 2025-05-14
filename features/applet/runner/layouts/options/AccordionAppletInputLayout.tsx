// File: features/applet/runner/layouts/options/AccordionAppletInputLayout.tsx
import React, { useRef, useEffect } from "react";
import { AppletInputProps } from "@/features/applet/runner/layouts/AppletLayoutManager";
import { ChevronDown } from "lucide-react";
import { fieldController } from "@/features/applet/runner/field-components/FieldController";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppletRuntimeContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import { CustomFieldLabelAndHelpText } from "@/constants/app-builder-help-text";

const AccordionAppletInputLayout: React.FC<AppletInputProps> = ({
    appletId,
    activeContainerId,
    setActiveContainerId,
    actionButton,
    className = "",
    isMobile = false,
    source = "applet",
    containerDescriptionLocation = "container-header",
}) => {
    const appletContainers = useAppSelector((state) => selectAppletRuntimeContainers(state, appletId));

    const contentRefs = useRef<Map<string, React.RefObject<HTMLDivElement>>>(new Map());
    const fieldRefs = useRef<Map<string, Map<string, React.ReactNode>>>(new Map());

    // Initialize content refs for each container
    useEffect(() => {
        appletContainers.forEach((container) => {
            if (!contentRefs.current.has(container.id)) {
                contentRefs.current.set(container.id, React.createRef<HTMLDivElement>());
            }

            // Initialize field refs for this container
            if (!fieldRefs.current.has(container.id)) {
                const groupFieldRefs = new Map<string, React.ReactNode>();
                fieldRefs.current.set(container.id, groupFieldRefs);

                // Render each field
                container.fields.forEach((field) => {
                    groupFieldRefs.set(field.id, fieldController({ field, appletId, isMobile, source }));
                });
            }
        });

        // Ensure we always have an active container
        if (!activeContainerId && appletContainers.length > 0) {
            setActiveContainerId(appletContainers[0].id);
        }
    }, [appletContainers, activeContainerId]);

    const toggleGroup = (groupId: string) => {
        if (groupId === activeContainerId) {
            // If clicking the active container, close it by setting activeContainerId to null
            setActiveContainerId(null);
        } else {
            // Otherwise, open the clicked container
            setActiveContainerId(groupId);
        }
    };


    return (
        <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
            <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700">
                {appletContainers.map((container, index) => {
                    const isActive = activeContainerId === container.id;
                    return (
                        <div key={container.id} className={`${index !== 0 ? "border-t dark:border-gray-700" : ""}`}>
                            <button
                                className={`w-full flex justify-between items-center p-4 text-left focus:outline-none 
                  ${isActive ? "bg-gray-50 dark:bg-gray-700" : "hover:bg-gray-50 dark:hover:bg-gray-700 hover: border border-gray-100 dark:border-gray-800"} cursor-pointer`}
                                onClick={() => toggleGroup(container.id)}
                            >
                                <div>
                                    <h3 className="text-lg font-medium text-rose-500">{container.label}</h3>
                                    {containerDescriptionLocation === "container-header" && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{container.description}</p>
                                    )}
                                </div>
                                <div><ChevronDown size={20} className={`transition-transform duration-300 ${isActive ? 'rotate-180' : ''}`} /></div>
                            </button>

                            <div
                                className="overflow-hidden transition-[height] duration-500 ease-in-out border-b border-gray-200 dark:border-gray-700"
                                style={{
                                    height: isActive ? contentRefs.current.get(container.id)?.current?.scrollHeight || "auto" : 0,
                                }}
                            >
                                <div ref={contentRefs.current.get(container.id) || null} className="p-4 pb-5 border-t dark:border-gray-700">
                                    {container.description && containerDescriptionLocation === "container-body" && (
                                        <div className="pr-1 mb-5 text-sm text-gray-500 dark:text-gray-400 ">{container.description}</div>
                                    )}

                                    <div>
                                        {container.fields.map((field) => (
                                            <div key={field.id} className="mb-5 last:mb-0">
                                                <CustomFieldLabelAndHelpText
                                                    fieldId={field.id}
                                                    fieldLabel={field.label}
                                                    helpText={field.helpText}
                                                    required={field.required}
                                                    className="mb-2"
                                                />
                                                {fieldRefs.current.get(container.id)?.get(field.id)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-end mt-4">{actionButton}</div>
        </div>
    );
};

export default AccordionAppletInputLayout;
