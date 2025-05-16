// File: features/applet/runner/layouts/options/FlatAppletInputLayoutAccordion.tsx
import React, { useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AppletInputProps } from "@/features/applet/runner/layouts/AppletLayoutManager";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppletRuntimeContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import FieldsWithLabels from "@/features/applet/runner/fields/core/FieldsWithLabels";

const FlatAppletInputLayoutAccordion: React.FC<AppletInputProps> = ({
    appletId,
    actionButton,
    className = "",
    isMobile = false,
    source = "applet",
}) => {
    const appletContainers = useAppSelector((state) => selectAppletRuntimeContainers(state, appletId));
    const [expanded, setExpanded] = useState(true); // Open by default
    const contentRef = useRef<HTMLDivElement>(null);
    
    const handleToggle = () => {
        setExpanded(!expanded);
    };
    
    return (
        <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
            <div className="border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
                {/* Accordion Header */}
                <button
                    className={`w-full flex justify-between items-center p-4 text-left focus:outline-none hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        expanded ? "bg-gray-50 dark:bg-gray-700" : ""
                    }`}
                    onClick={handleToggle}
                >
                    <h3 className="text-lg font-medium text-rose-500">Information</h3>
                    <div>{expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
                </button>
                
                {/* Accordion Content */}
                <div
                    className="overflow-hidden transition-[height] duration-500 ease-in-out"
                    style={{
                        height: expanded ? contentRef.current?.scrollHeight || "auto" : 0,
                    }}
                >
                    <div ref={contentRef} className="p-6">
                        {appletContainers.map((container, groupIndex) => (
                            <div key={container.id} className="mb-8">
                                {/* Group header with minimal padding */}
                                {appletContainers.length > 1 && (
                                    <div className="mb-4">
                                        <h4 className="text-lg font-medium text-rose-500 dark:text-rose-400">
                                            {container.label}
                                        </h4>
                                        {container.description && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {container.description}
                                            </p>
                                        )}
                                    </div>
                                )}
                                
                                {/* Group fields */}
                                <div className="grid grid-cols-1 gap-y-6">
                                    <FieldsWithLabels
                                        fields={container.fields}
                                        appletId={appletId}
                                        isMobile={isMobile}
                                        source={source}
                                        className="contents"
                                        wrapperClassName=""
                                        showLabels={true}
                                        showHelpText={true}
                                        showRequired={true}
                                        labelPosition="top"
                                        labelClassName="mb-2"
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
            </div>
        </div>
    );
};

export default FlatAppletInputLayoutAccordion;