import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AppletInputProps } from "@/features/applet/runner/layouts/AppletLayoutManager";
import { AppletFieldController } from "@/features/applet/runner/fields/AppletFieldController";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppletRuntimeContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import { CustomFieldLabelAndHelpText } from "@/constants/app-builder-help-text";

export const gridColsOptions = [
  { value: "grid-cols-1", label: "1 Column" },
  { value: "grid-cols-2", label: "2 Columns" },
  { value: "grid-cols-3", label: "3 Columns" },
  { value: "grid-cols-4", label: "4 Columns" },
  { value: "grid-cols-auto", label: "Auto-fit" },
];

// Smart utility function to determine grid columns based on field count
const getSmartGridCols = (preferredGridCols: string, fieldCount: number): string => {
    // If only one field, always use single column
    if (fieldCount === 1) {
        return "grid-cols-1";
    }
    
    // If preferred setting is auto, use 2 columns as default
    if (preferredGridCols === "grid-cols-auto") {
        return "grid-cols-2";
    }
    
    // Otherwise, respect the preferred setting
    return preferredGridCols || "grid-cols-2";
};

// Map of grid classes to ensure Tailwind can properly parse them
const gridClassMap: Record<string, string> = {
    "grid-cols-1": "grid-cols-1",
    "grid-cols-2": "grid-cols-2",
    "grid-cols-3": "grid-cols-3",
    "grid-cols-4": "grid-cols-4",
};

interface MinimalistSearchLayoutProps extends AppletInputProps {
    gridCols?: string;
}

const MinimalistSearchLayout: React.FC<MinimalistSearchLayoutProps> = ({
    appletId,
    activeContainerId,
    setActiveContainerId,
    actionButton,
    className = "",
    source = "applet",
    gridCols = "grid-cols-2",
}) => {
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const appletContainers = useAppSelector((state) => selectAppletRuntimeContainers(state, appletId));

    return (
        <div className={`w-full max-w-5xl mx-auto p-4 ${className}`}>
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-8">
                <h2 className="text-2xl font-light text-center">What are you looking for?</h2>
            </div>
            <div className="space-y-10">
                {appletContainers.map((container) => {
                    const isExpanded = expandedGroup === container.id;
                    // Calculate the smart grid columns for this container
                    const containerGridCols = getSmartGridCols(gridCols, container.fields.length);
                    const gridClass = gridClassMap[containerGridCols] || "grid-cols-2";
                    
                    return (
                        <div key={container.id} className="transition-all duration-300">
                            <div
                                className="flex items-center cursor-pointer py-3 border-b border-gray-200 dark:border-gray-700"
                                onClick={() => setExpandedGroup(isExpanded ? null : container.id)}
                            >
                                <h3 className="text-xl font-light text-gray-800 dark:text-gray-200 flex-grow">{container.label}</h3>
                                <div className={`transform transition-transform duration-300`}>
                                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>
                            <div
                                className={`transition-all duration-500 ease-in-out overflow-hidden ${
                                    isExpanded ? "max-h-[1000px] opacity-100 mt-6" : "max-h-0 opacity-0"
                                }`}
                            >
                                <div className={`grid md:${gridClass} gap-6`}>
                                    {container.fields.map((field) => (
                                        <div key={field.id}>
                                            <CustomFieldLabelAndHelpText
                                                fieldId={field.id}
                                                fieldLabel={field.label}
                                                helpText={field.helpText}
                                                required={field.required}
                                                className="mb-2"
                                            />
                                            {AppletFieldController({ field, appletId, isMobile: false, source })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-center mt-12">{actionButton}</div>
        </div>
    );
};

export default MinimalistSearchLayout;