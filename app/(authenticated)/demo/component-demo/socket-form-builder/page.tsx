'use client';

import DynamicForm from "@/components/socket/form-builder/DynamicForm";
import { SOCKET_TASKS } from "@/constants/socket-constants";

export default function SocketFormBuilder() {
    const quickScrapeTask = SOCKET_TASKS.quick_scrape;

    const handleChange = (data: any) => {
        console.log("Data changed:", data);
    };

    const handleSubmit = (data: any) => {
        console.log("Data submitted:", data);
    };

    return <DynamicForm schema={quickScrapeTask} onChange={handleChange} onSubmit={handleSubmit} />;
}
