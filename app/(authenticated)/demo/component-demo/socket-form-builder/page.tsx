'use client';

import DynamicForm from "@/components/socket/form-builder/DynamicForm";

export default function SocketFormBuilder() {
    const handleChange = (data: Record<string, any>) => {
        console.log("Data changed:", data);
    };

    const handleSubmit = (data: Record<string, any>) => {
        console.log("Data submitted:", data);
    };

    return <DynamicForm taskType="quick_scrape" onChange={handleChange} onSubmit={handleSubmit} />;
}
