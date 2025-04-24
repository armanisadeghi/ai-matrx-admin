"use client";
import { SocketHeaderFull } from "@/components/socket-io/headers/SocketHeaderFull";
import DynamicForm from "@/components/socket-io/form-builder/DynamicForm";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";
import { useMeasure } from "@uidotdev/usehooks";
import { getAllFieldPaths } from "@/constants/socket-schema";

export default function ReduxFormTest() {
    const [taskId, setTaskId] = useState<string>("");
    const [ref, { width, height }] = useMeasure();
    const taskState = useSelector((state: RootState) => (taskId ? state.socketTasks.tasks[taskId] : null));
    const allFieldPaths = getAllFieldPaths(taskState?.taskName || "");
    
    console.log("width", width);
    console.log("height", height);
    
    useEffect(() => {
        console.log("taskId", taskId);
    }, [taskId]);
    
    return (
        <div className="flex flex-col max-h-screen">
            <div className="sticky top-0 z-10 bg-inherit text-inherit">
                <SocketHeaderFull onTaskCreate={setTaskId} />
            </div>
            <div ref={ref} className="flex flex-row flex-1 p-4">
                {/* Left side: Dynamic Form - 1/2 width */}
                <div className="w-1/2 overflow-y-auto pr-4 h-full" style={{ maxHeight: `${height}px` }}>
                    {taskId ? (
                        <DynamicForm taskId={taskId} />
                    ) : (
                        <p className="bg-inherit text-inherit">No task selected. Use the header to create a task.</p>
                    )}
                </div>
                {/* Middle: Raw JSON state - 1/4 width */}
                <div className="w-1/4 overflow-y-auto px-4 border-l border-gray-200 h-full" style={{ maxHeight: `${height}px` }}>
                    <h2 className="text-lg font-bold mb-2">Raw Task State</h2>
                    {taskState ? (
                        <pre className="bg-inherit text-inherit p-4 rounded text-sm whitespace-pre-wrap">
                            {JSON.stringify(taskState, null, 2)}
                        </pre>
                    ) : (
                        <p className="bg-inherit text-inherit">No task state available. Create a task to view its state.</p>
                    )}
                </div>
                {/* Right side: Field Paths - 1/4 width */}
                <div className="w-1/4 overflow-y-auto pl-4 border-l border-gray-200 h-full" style={{ maxHeight: `${height}px` }}>
                    <h2 className="text-lg font-bold mb-2">Field Paths</h2>
                    {allFieldPaths.length > 0 ? (
                        <pre className="bg-inherit text-inherit p-4 rounded text-sm whitespace-pre-wrap">
                            {JSON.stringify(allFieldPaths, null, 2)}
                        </pre>
                    ) : (
                        <p className="bg-inherit text-inherit">No field paths available. Create a task to view its field paths.</p>
                    )}
                </div>
            </div>
        </div>
    );
}