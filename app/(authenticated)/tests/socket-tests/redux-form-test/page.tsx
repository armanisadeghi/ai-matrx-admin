"use client";

import AdminFormDemo from "@/components/socket-io/demos/AdminFormDemo";

const DEBUG_MODE = true;

export default function page() {
        
    return (
        <div className="bg-gray-100 dark:bg-gray-800 w-full h-full">
            <AdminFormDemo debugMode={DEBUG_MODE}/>
        </div>
    );
}