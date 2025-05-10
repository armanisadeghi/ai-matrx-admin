import React, { useState } from "react";
import { AppletInputProps } from "@/features/applet/runner/layouts/core/AppletInputLayoutManager";
import { fieldController } from "@/features/applet/runner/field-components/FieldController";
import UniformHeightWrapper from "@/features/applet/runner/layouts/core/UniformHeightWrapper";
import { ChevronRight, Send } from "lucide-react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectActiveAppletContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";

interface SidebarSearchLayoutProps extends AppletInputProps {
    fullWidth?: boolean;
}

const SidebarSearchLayout: React.FC<SidebarSearchLayoutProps> = ({
    actionButton,
    className = "",
    fullWidth = false,
}) => {
    const activeAppletContainers = useAppSelector(state => selectActiveAppletContainers(state))
    const [activeGroupId, setActiveGroupId] = useState(activeAppletContainers.length > 0 ? activeAppletContainers[0].id : null);

    // Find current container index to determine if it's the last one
    const currentGroupIndex = activeAppletContainers.findIndex((container) => container.id === activeGroupId);
    const isLastGroup = currentGroupIndex === activeAppletContainers.length - 1;

    // Function to navigate to the next container
    const handleNext = () => {
        if (currentGroupIndex < activeAppletContainers.length - 1) {
            setActiveGroupId(activeAppletContainers[currentGroupIndex + 1].id);
        }
    };

    // Layout type identifier for UniformHeightWrapper
    const layoutType = fullWidth ? "fullWidthSidebar" : "sidebar";

    // Width classes based on layout type
    const containerWidthClass = fullWidth ? "w-full" : "w-full max-w-6xl mx-auto";

    return (
        <div className={`${containerWidthClass} ${className}`}>
            <div className="flex flex-col md:flex-row h-full">
                {/* Sidebar */}
                <div className="w-full md:w-64 border-r dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                    <h3 className="text-lg font-medium mb-6 text-rose-500 dark:text-rose-500">
                        <span className="inline-block border-b-2 border-gray-200 dark:border-gray-700 pb-2">Options</span>
                    </h3>
                    <div className="space-y-1">
                        {activeAppletContainers.map((container) => (
                            <button
                                key={container.id}
                                onClick={() => setActiveGroupId(container.id)}
                                className={`w-full text-left px-4 py-3 rounded-lg transition ${
                                    activeGroupId === container.id
                                        ? "bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-100"
                                        : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                }`}
                            >
                                <div className="flex items-center">
                                    <span className="flex-grow">{container.label}</span>
                                    {activeGroupId === container.id && (
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <polyline points="9 18 15 12 9 6"></polyline>
                                        </svg>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main content area with relative positioning */}
                <div className="flex-grow p-6 bg-white dark:bg-gray-900 relative flex flex-col">
                    {/* Content container with fixed height */}
                    <div className="flex-grow relative" style={{ minHeight: "400px" }}>
                        {activeAppletContainers.map((container) => (
                            <UniformHeightWrapper
                                key={container.id}
                                groupId={container.id}
                                layoutType={layoutType}
                                className={`transition-opacity duration-300 h-full ${
                                    activeGroupId === container.id
                                        ? "opacity-100 visible"
                                        : "opacity-0 invisible absolute top-0 left-0 w-full h-full"
                                }`}
                                enabled={true}
                            >
                                <div className="flex flex-col">
                                    <div className="mb-6">
                                        <h2 className="text-2xl font-medium text-gray-900 dark:text-gray-100">{container.label}</h2>
                                        {container.description && <p className="mt-2 text-gray-600 dark:text-gray-400">{container.description}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                        {container.fields.map((field) => (
                                            <div key={field.id}>
                                                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
                                                    {field.label}
                                                </label>
                                                {fieldController(field, false)}
                                                {field.helpText && (
                                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </UniformHeightWrapper>
                        ))}
                    </div>

                    {/* Footer with action button - always at the bottom */}
                    <div className="flex justify-end">
                        {actionButton ||
                            (isLastGroup ? (
                                <button className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white rounded-md px-6 py-3 flex items-center">
                                    <span className="mr-2">Submit</span>
                                    <Send size={16} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleNext}
                                    className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white rounded-md px-6 py-3 flex items-center"
                                >
                                    <span className="mr-2">Next</span>
                                    <ChevronRight size={16} />
                                </button>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SidebarSearchLayout;
