"use client";
import DynamicForm from "@/components/socket/form-builder/DynamicForm";
import { CompactSocketHeader } from "@/components/socket/headers/CompactSocketHeader";
import AccordionWrapper from "@/components/matrx/matrx-collapsible/AccordionWrapper";
import SocketDebugPanel from "@/components/socket/SocketDebugPanel";
import ScraperResultsComponent from "@/features/scraper/ScraperResultsComponent";
import { useScraperSocket } from "@/lib/redux/socket/hooks/task-socket-hooks/useScraperSocket";

const DEBUG_MODE = true;

export default function Page() {
    const { socketHook, taskSchema, handleChange, handleSubmit } = useScraperSocket();

    return (
        <div className="flex flex-col gap-4 bg-gray-100 dark:bg-gray-800 rounded-2xl p-4">
            <CompactSocketHeader socketHook={socketHook} defaultService="scrape_service" defaultTask="quick_scrape" />
            <DynamicForm schema={taskSchema} onChange={handleChange} onSubmit={handleSubmit} minimalSpace={true} />
            <ScraperResultsComponent socketHook={socketHook} />
            {DEBUG_MODE && (
                <div className="mt-8 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-600 shadow-sm">
                    <AccordionWrapper title="Socket Debug Panel" value="socket-debug" defaultOpen={false}>
                        <div className="pt-4">
                            <SocketDebugPanel socketHook={socketHook} />
                        </div>
                    </AccordionWrapper>
                </div>
            )}
        </div>
    );
}
