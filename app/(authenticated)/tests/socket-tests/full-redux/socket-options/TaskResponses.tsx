"use client";
import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";
import { selectAllResponses, selectTaskById, selectTaskListenerIds } from "@/lib/redux/socket-io";
import SocketAdminErrorDisplay from "../socket-response/SocketErrors";
import SocketTextDisplay from "../socket-response/SocketTextDisplay";
import SocketDataDisplay from "../socket-response/SocketDataDisplay";
import SocketInfoDisplay from "../socket-response/SocketInfoDisplay";
import SocketStatusDisplay from "../socket-response/SocketStatusDisplay";

interface TaskResponsesProps {
    taskId: string | null;
}

const TaskResponses: React.FC<TaskResponsesProps> = ({ taskId }) => {
    const task = useSelector((state: RootState) => (taskId ? selectTaskById(state, taskId) : null));
    const listenerIds = useSelector((state: RootState) => (taskId ? selectTaskListenerIds(state, taskId) : []));
    const responses = useSelector(selectAllResponses);

    if (!task || !taskId) {
        return null;
    }

    return (
        <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-6">
                {listenerIds.length > 0 ? (
                    listenerIds.map((eventName) => (
                        <div
                            key={eventName}
                            className="p-4 border-border rounded-md bg-white dark:bg-zinc-800"
                        >
                            <h4 className="text-md font-medium mb-3 text-gray-800 dark:text-gray-200">
                                Event {eventName}{" "}
                                {responses[eventName]?.ended && <span className="text-green-600 dark:text-green-400">(Ended)</span>}
                            </h4>
                            <div className="space-y-3 text-sm">
                                <SocketTextDisplay eventName={eventName} />
                                <SocketDataDisplay eventName={eventName} />
                                <SocketInfoDisplay eventName={eventName} />
                                <SocketAdminErrorDisplay eventName={eventName} />
                                <SocketStatusDisplay eventName={eventName} />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-4 border-border rounded-md bg-white dark:bg-zinc-800">
                        <p className="text-gray-500 dark:text-gray-400">No active events for this task</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskResponses;
