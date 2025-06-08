"use client";

import React from "react";
import { TaskSidebar } from "./TaskSidebar";
import { ResultsSidebar } from "./ResultsSidebar";

interface DualSidebarProps {
    selectedTaskId: string | null;
    onTaskSelect: (taskId: string) => void;
    selectedDataType?: "text" | "data" | "info" | "error";
    selectedIndex?: number;
    onDataTypeChange?: (dataType: "text" | "data" | "info" | "error", index?: number) => void;
}

export const DualSidebar: React.FC<DualSidebarProps> = ({ 
    selectedTaskId, 
    onTaskSelect, 
    selectedDataType, 
    selectedIndex, 
    onDataTypeChange 
}) => {
    return (
        <div className="flex h-full w-full">
            {/* Left Sidebar - Tasks (40%) */}
            <div className="flex-[2] min-w-0">
                <TaskSidebar selectedTaskId={selectedTaskId} onTaskSelect={onTaskSelect} />
            </div>
            
            {/* Right Sidebar - Results (60%) */}
            <div className="flex-[3] min-w-0">
                <ResultsSidebar 
                    selectedTaskId={selectedTaskId} 
                    selectedDataType={selectedDataType}
                    selectedIndex={selectedIndex}
                    onDataTypeChange={onDataTypeChange}
                />
            </div>
        </div>
    );
}; 