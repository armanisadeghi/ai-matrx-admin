'use client';

import DynamicForm from "@/components/socket/form-builder/DynamicForm";
import { SOCKET_TASKS } from "@/constants/socket-constants";
import { useSocket } from "@/lib/redux/socket/hooks/useSocket";
import { useEffect } from "react";
import { CompactSocketHeader } from "@/components/socket/headers/CompactSocketHeader";
import AccordionWrapper from "@/components/matrx/matrx-collapsible/AccordionWrapper";
import SocketDebugPanel from "@/components/socket/SocketDebugPanel";
import ScraperResultsComponent from "@/features/scraper/ScraperResultsComponent";
const DEBUG_MODE = true;

export default function Page() {
    const quickScrapeTask = SOCKET_TASKS.quick_scrape;

    const socketHook = useSocket();

    const {
        setNamespace,
        setService,
        setTaskType,
        setTaskData,
        handleSend,
        handleClear,
    } = socketHook;


    useEffect(() => {
        setNamespace("UserSession");
        setService("scrape_service");
        setTaskType("quick_scrape");
    }, []);

    const handleChange = (data: any) => {
        setTaskData(data);
    };

    const handleSubmit = (data: any) => {
        setTaskData(data);
        handleSend();
    };

    return (
        <div className="flex flex-col gap-4 bg-gray-100 dark:bg-gray-800 rounded-2xl p-4">
            <CompactSocketHeader socketHook={socketHook} defaultService="scrape_service" defaultTask="quick_scrape" />
            <DynamicForm schema={quickScrapeTask} onChange={handleChange} onSubmit={handleSubmit} />
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
