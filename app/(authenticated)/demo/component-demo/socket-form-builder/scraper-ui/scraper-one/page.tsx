'use client';

import DynamicForm from "@/components/socket/form-builder/DynamicForm";
import { SOCKET_TASKS } from "@/constants/socket-constants";
import ScraperResultsDisplay from "./ScraperResultsDisplay";
import { useSocket } from "@/lib/redux/socket/hooks/useSocket";
import { useEffect } from "react";
import { CompactSocketHeader } from "@/components/socket/headers/CompactSocketHeader";
import AccordionWrapper from "@/components/matrx/matrx-collapsible/AccordionWrapper";
import SocketDebugPanel from "@/components/socket/SocketDebugPanel";
import MinimalScraperDisplay from "./MinimalScraperDisplay";
import ImprovedScraperDisplay from "./ImprovedScraperDisplay";
import SafeScraperDisplay from "./SafeResultsDisplay";
const DEBUG_MODE = true;

export default function SocketFormBuilder() {
    const quickScrapeTask = SOCKET_TASKS.quick_scrape;

    const socketHook = useSocket();

    const {
        namespace,
        setNamespace,
        service,
        setService,
        taskType,
        setTaskType,

        // Stream and connection state
        streamEnabled,
        setStreamEnabled,
        isResponseActive,
        isConnected,
        isAuthenticated,

        // Task state and handlers
        tasks,
        setTaskData,

        // Response state
        streamingResponse,
        responses,
        responseRef,

        // Action handlers
        handleSend,
        handleClear,
    } = socketHook;


    useEffect(() => {
        setNamespace("UserSession");
        setService("scrape_service");
        setTaskType("quick_scrape");
    }, [setNamespace, setService, setTaskType]);

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
            <ScraperResultsDisplay socketHook={socketHook} />
            {/* <MinimalScraperDisplay socketHook={socketHook} /> */}
            {/* <ImprovedScraperDisplay socketHook={socketHook} /> */}
            {/* <SafeScraperDisplay socketHook={socketHook} /> */}
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
