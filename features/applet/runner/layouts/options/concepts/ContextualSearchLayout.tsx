import React, { useState } from "react";
import { AppletInputProps } from "@/features/applet/runner/layouts/AppletLayoutManager";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppletRuntimeContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import { contextStyles, ContextStyleType } from "@/features/applet/styles/contextStyles";
import FieldsWithLabels from "@/features/applet/runner/fields/core/FieldsWithLabels";

// TODO: Use the logic already created for automated entity icons to find a context and use it, if one is not available.
// But this could easily be set by the user for each container.
// For testing, we're only using these 4 contexts
const TESTING_CONTEXTS: ContextStyleType[] = ["hotels", "flights", "dining", "activities"];

const ContextualSearchLayout: React.FC<AppletInputProps> = ({
    appletId,
    activeContainerId,
    setActiveContainerId,
    actionButton,
    className = "",
    isMobile = false,
    source = "applet",
}) => {
    const appletContainers = useAppSelector((state) => selectAppletRuntimeContainers(state, appletId));
    const [context, setContext] = useState<ContextStyleType>("hotels");
    const currentStyle = contextStyles[context];
    
    return (
        <div
            className={`w-full ${className}`}
            style={{
                background: currentStyle.fallbackBg,
                backgroundSize: "cover",
                backgroundPosition: "center",
                transition: "background 1s ease-in-out",
            }}
        >
            {/* Context selector */}
            <div className="w-full max-w-5xl mx-auto pt-10 pb-6 px-4">
                <div className="flex justify-center mb-8">
                    <div className="inline-flex items-center bg-black bg-opacity-50 backdrop-blur-sm rounded-full p-1">
                        {TESTING_CONTEXTS.map((key) => (
                            <button
                                key={key}
                                onClick={() => setContext(key)}
                                className={`flex items-center text-white rounded-full px-4 py-2 transition ${
                                    context === key ? "bg-rose-500" : "hover:bg-white hover:bg-opacity-10"
                                }`}
                            >
                                <span className="mr-2">{contextStyles[key].icon}</span>
                                <span className="capitalize">{key}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90">
                    <h2 className="text-2xl font-medium text-center mb-8">Find the perfect {context}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {appletContainers.map((container) => (
                            <div key={container.id} className="space-y-6">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{container.label}</h3>
                                <FieldsWithLabels
                                    fields={container.fields}
                                    appletId={appletId}
                                    isMobile={isMobile}
                                    source={source}
                                    className="space-y-6"
                                    wrapperClassName=""
                                    showLabels={true}
                                    showHelpText={true}
                                    showRequired={false} // The original doesn't show required indicators
                                    labelPosition="top"
                                    labelClassName="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="mt-10 flex justify-center">{actionButton}</div>
                </div>
            </div>
        </div>
    );
};

export default ContextualSearchLayout;