import React from "react";
import { useAppSelector } from "@/lib/redux";
import { selectTaskById, selectTaskDataById } from "@/lib/redux/socket-io";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TaskDebugDisplayProps {
    taskId: string;
}

const TaskDebugDisplay: React.FC<TaskDebugDisplayProps> = ({ taskId }) => {
    const task = useAppSelector((state) => selectTaskById(state, taskId));
    const taskData = useAppSelector((state) => selectTaskDataById(state, taskId));

    if (!task || !taskData) {
        return (
            <Card className="bg-gray-100 dark:bg-gray-800">
                <CardHeader>
                    <CardTitle className="text-sm text-gray-700 dark:text-gray-300">Task Debug Info</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-500 dark:text-gray-400">No task data available</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-gray-100 dark:bg-gray-800">
            <CardHeader>
                <CardTitle className="text-sm text-gray-700 dark:text-gray-300">
                    Task Debug Info - {task.taskName}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Task Metadata:</h4>
                    <pre className="bg-gray-200 dark:bg-gray-700 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify({
                            taskId: task.taskId,
                            taskName: task.taskName,
                            service: task.service,
                            status: task.status,
                            isValid: task.isValid,
                            isStreaming: task.isStreaming,
                            connectionId: task.connectionId
                        }, null, 2)}
                    </pre>
                </div>
                
                <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Task Data:</h4>
                    <pre className="bg-gray-200 dark:bg-gray-700 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(taskData, null, 2)}
                    </pre>
                </div>
                
                <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data Types:</h4>
                    <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded text-xs">
                        {Object.entries(taskData).map(([key, value]) => (
                            <div key={key} className="mb-1">
                                <span className="font-medium">{key}:</span> {typeof value} 
                                {Array.isArray(value) && ` (array of ${value.length} items)`}
                                {value && typeof value === 'object' && !Array.isArray(value) && ` (object with ${Object.keys(value).length} properties)`}
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default TaskDebugDisplay; 