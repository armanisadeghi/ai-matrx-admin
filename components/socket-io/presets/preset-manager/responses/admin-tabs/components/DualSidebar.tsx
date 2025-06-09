"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { TaskSidebar } from "./TaskSidebar";
import { 
    ResultsSidebar,
    InfoResponseItemComponent,
    ErrorResponseItemComponent,
    TextResponseItemComponent,
    DataResponseItemComponent,
    WorkflowSummaryItemComponent,
    StepCompletionItemComponent,
    LoadingWorkItemComponent
} from "./ResultsSidebar";

// Interface for TaskSidebar props (for custom override)
export interface TaskSidebarProps {
    selectedTaskId: string | null;
    onTaskSelect: (taskId: string) => void;
}

// Component type definition for TaskSidebar
export type TaskSidebarComponent = React.FC<TaskSidebarProps>;

interface DualSidebarProps {
    selectedTaskId: string | null;
    onTaskSelect: (taskId: string) => void;
    selectedDataType?: "text" | "data" | "info" | "error";
    selectedIndex?: number;
    onDataTypeChange?: (dataType: "text" | "data" | "info" | "error", index?: number) => void;
    
    // Layout customization
    className?: string;
    splitRatio?: [number, number]; // [leftSidebarRatio, rightSidebarRatio] - defaults to [2, 3] (40%, 60%)
    
    // Override component props
    TaskSidebarComponent?: TaskSidebarComponent;
    InfoResponseItemComponent?: InfoResponseItemComponent;
    ErrorResponseItemComponent?: ErrorResponseItemComponent;
    TextResponseItemComponent?: TextResponseItemComponent;
    DataResponseItemComponent?: DataResponseItemComponent;
    WorkflowSummaryItemComponent?: WorkflowSummaryItemComponent;
    StepCompletionItemComponent?: StepCompletionItemComponent;
    LoadingWorkItemComponent?: LoadingWorkItemComponent;
}

export const DualSidebar: React.FC<DualSidebarProps> = ({ 
    selectedTaskId, 
    onTaskSelect, 
    selectedDataType, 
    selectedIndex, 
    onDataTypeChange,
    className,
    splitRatio = [2, 3],
    TaskSidebarComponent = TaskSidebar,
    InfoResponseItemComponent,
    ErrorResponseItemComponent,
    TextResponseItemComponent,
    DataResponseItemComponent,
    WorkflowSummaryItemComponent,
    StepCompletionItemComponent,
    LoadingWorkItemComponent,
}) => {
    const [leftRatio, rightRatio] = splitRatio;
    
    return (
        <div className={cn("flex h-full w-full", className)}>
            {/* Left Sidebar - Tasks */}
            <div className="min-w-0" style={{ flex: leftRatio }}>
                <TaskSidebarComponent selectedTaskId={selectedTaskId} onTaskSelect={onTaskSelect} />
            </div>
            
            {/* Right Sidebar - Results */}
            <div className="min-w-0" style={{ flex: rightRatio }}>
                <ResultsSidebar 
                    selectedTaskId={selectedTaskId} 
                    selectedDataType={selectedDataType}
                    selectedIndex={selectedIndex}
                    onDataTypeChange={onDataTypeChange}
                    InfoResponseItemComponent={InfoResponseItemComponent}
                    ErrorResponseItemComponent={ErrorResponseItemComponent}
                    TextResponseItemComponent={TextResponseItemComponent}
                    DataResponseItemComponent={DataResponseItemComponent}
                    WorkflowSummaryItemComponent={WorkflowSummaryItemComponent}
                    StepCompletionItemComponent={StepCompletionItemComponent}
                    LoadingWorkItemComponent={LoadingWorkItemComponent}
                />
            </div>
        </div>
    );
}; 