"use client";
import { SocketHeaderFull } from "@/components/socket-io/headers/SocketHeaderFull";
import DynamicForm from "@/components/socket-io/form-builder/DynamicForm";
import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";
import { useMeasure } from "@uidotdev/usehooks";
import { getAllFieldPaths } from "@/constants/socket-schema";
import AccordionWrapper from "@/components/matrx/matrx-collapsible/AccordionWrapper";
import TaskDataDebug from "../form-builder/TaskDataDebug";

const AdminFormDemo = ({ debugMode }: { debugMode: boolean }) => {
    const [taskId, setTaskId] = useState<string>("");
    const [ref, { width, height }] = useMeasure();
    const taskState = useSelector((state: RootState) => (taskId ? state.socketTasks.tasks[taskId] : null));
    const allFieldPaths = getAllFieldPaths(taskState?.taskName || "");

    return (
        <div className="flex flex-col max-h-screen bg-inherit text-inherit">
            <div className="sticky top-0 z-50 bg-inherit text-inherit">
                <SocketHeaderFull onTaskCreate={setTaskId} />
            </div>
            <div ref={ref} className="flex flex-row flex-1 p-4">
                {/* Left side: Dynamic Form - 1/2 width */}
                <div className="w-3/4 overflow-y-auto pr-4 h-full scrollbar-none" style={{ maxHeight: `${height}px` }}>
                    {taskId ? (
                        <DynamicForm taskId={taskId} showDebug={false} />
                    ) : (
                        <p className="bg-inherit text-inherit">No task selected. Use the header to create a task.</p>
                    )}
                </div>
                {/* Debug Section */}
                <div className="w-1/4 overflow-y-auto px-2 h-full space-y-2 scrollbar-none" style={{ maxHeight: `${height}px` }}>
                    <AccordionWrapper
                        title={"Raw Task State"}
                        value={"raw-task-state"}
                        defaultOpen={false}
                        className={"border border-zinc-200 dark:border-zinc-700 rounded-3xl"}
                    >
                        {taskState ? (
                            <pre className="bg-inherit text-inherit p-4 rounded text-sm whitespace-pre-wrap">
                                {JSON.stringify(taskState, null, 2)}
                            </pre>
                        ) : (
                            <p className="bg-inherit text-inherit">No task state available. Create a task to view its state.</p>
                        )}
                    </AccordionWrapper>
                    <AccordionWrapper
                        title={"Field Paths"}
                        value={"field-paths"}
                        defaultOpen={false}
                        className={"border border-zinc-200 dark:border-zinc-700 rounded-3xl"}
                    >
                        {allFieldPaths.length > 0 ? (
                            <pre className="bg-inherit text-inherit p-4 rounded text-sm whitespace-pre-wrap">
                                {JSON.stringify(allFieldPaths, null, 2)}
                            </pre>
                        ) : (
                            <p className="bg-inherit text-inherit">No field paths available. Create a task to view its field paths.</p>
                        )}
                    </AccordionWrapper>
                    <AccordionWrapper
                        title={"Task State"}
                        value={"task-state"}
                        defaultOpen={false}
                        className={"border border-zinc-200 dark:border-zinc-700 rounded-3xl"}
                    >
                        <TaskDataDebug taskId={taskId} show={debugMode} />
                    </AccordionWrapper>
                </div>
            </div>
        </div>
    );
};

export default AdminFormDemo;
