"use client";
import { useState, useEffect } from "react";
import DynamicForm from "@/components/socket/form-builder/DynamicForm";
import { CompactSocketHeader } from "@/components/socket/headers/CompactSocketHeader";
import AccordionWrapper from "@/components/matrx/matrx-collapsible/AccordionWrapper";
import SocketDebugPanel from "@/components/socket/SocketDebugPanel";
import ScraperResultsComponent from "@/features/scraper/ScraperResultsComponent";
import { useScraperSocket } from "@/lib/redux/socket/hooks/task-socket-hooks/useScraperSocket";
import { ChevronUp, ChevronDown, RefreshCw } from "lucide-react";
import { getTaskSchema } from "@/constants/socket-schema";

const DEBUG_MODE = true;

export default function Page() {
    const { socketHook, taskSchema, handleChange, handleSubmit } = useScraperSocket();
    const [controlsExpanded, setControlsExpanded] = useState(true);
    const { isResponseActive, tasks, taskType } = socketHook;

    // Auto-collapse controls when response becomes active
    useEffect(() => {
        if (isResponseActive) {
            setControlsExpanded(false);
        }
    }, [isResponseActive]);

    return (
        <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
            {/* Controls Section */}
            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    controlsExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                }`}
            >
                <div className="p-4">
                    <CompactSocketHeader socketHook={socketHook} defaultService="scrape_service" defaultTask="quick_scrape" />
                    <div className="mt-4">
                        <DynamicForm taskType={taskType} onChange={handleChange} onSubmit={handleSubmit} minimalSpace={true} />
                    </div>
                </div>
            </div>

            {/* Toggle Bar */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between items-center px-4 py-2">
                    <div className="flex items-center">
                        <button
                            onClick={() => setControlsExpanded(!controlsExpanded)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            {controlsExpanded ? (
                                <>
                                    <span className="text-sm font-medium">Hide Form</span>
                                    <ChevronUp size={16} />
                                </>
                            ) : (
                                <>
                                    <span className="text-sm font-medium">Show Form</span>
                                    <ChevronDown size={16} />
                                </>
                            )}
                        </button>
                    </div>

                    {isResponseActive && (
                        <div className="text-sm text-blue-600 dark:text-blue-400">
                            <span>Results Available</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Results Section */}
            <div className="flex-1">
                <div className={`p-4 ${!controlsExpanded ? "pt-2" : ""}`}>
                    <ScraperResultsComponent socketHook={socketHook} />
                </div>
            </div>

            {/* Debug Panel */}
            {DEBUG_MODE && (
                <div className="mt-4 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm">
                    <AccordionWrapper title="Socket Debug Panel" value="socket-debug" defaultOpen={false}>
                        <div className="p-4">
                            <SocketDebugPanel socketHook={socketHook} />
                        </div>
                    </AccordionWrapper>
                </div>
            )}
        </div>
    );
}
