"use client";

import DynamicForm from "@/components/socket/form-builder/DynamicForm";
import { useSocket } from "@/lib/redux/socket/hooks/useSocket";
import { useEffect } from "react";
import { CompactSocketHeader } from "@/components/socket/headers/CompactSocketHeader";
import ScraperResults from "./ScraperResults";
import SocketDebugPanel from "@/components/socket/SocketDebugPanel";
import AccordionWrapper from "@/components/matrx/matrx-collapsible/AccordionWrapper";
import { getTaskSchema } from "@/constants/socket-schema";


const DEBUG_MODE = true;

export default function Page() {
    const taskName = "quick_scrape"

    const schema = getTaskSchema(taskName);
    console.log(schema);

    const socketHook = useSocket();

    const {
        setNamespace,
        setService,
        setTaskType,
        setTaskData,
        handleSend,
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
            <DynamicForm taskType={"quick_scrape"} onChange={handleChange} onSubmit={handleSubmit} />
            <ScraperResults socketHook={socketHook} />
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
