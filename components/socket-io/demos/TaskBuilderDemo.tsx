// Example: Socket Task Builder Component
import React, { useEffect } from "react";
import { useSocketTask } from "@/lib/redux/socket-io/hooks/useSocketTasks";
import { TaskField } from "@/components/socket-io/Taskfields/TaskField";
import { TaskForm } from "@/components/socket-io/Taskfields/TaskForm";
import { SocketHeaderFull } from "../headers/SocketHeaderFull";
import { Separator } from "@/components/ui/separator";

export const TaskBuilderDemo: React.FC = () => {
    // Create a new task
    const { create } = useSocketTask();
    const [taskId, setTaskId] = React.useState<string | null>(null);

    useEffect(() => {
        // Create a RUN_RECIPE task when component mounts
        const id = create("cockpit_service", "run_recipe");
        setTaskId(id);
    }, [create]);

    if (!taskId) return <div>Loading...</div>;

    return (
        <div className="task-builder space-y-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 p-2">
            <SocketHeaderFull />
            <h2 className="text-2xl font-bold mb-2">Run Recipe</h2>

            {/* Option 1: Use the form component to render all fields */}
            <div className="manual-fields bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 p-2 rounded-3xl">
                <TaskForm taskId={taskId} className="bg-inherit text-inherit"/>
            </div>

            {/* Option 2: Or manually render specific fields */}
            <div className="manual-fields bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 p-2 rounded-3xl">
                <TaskField taskId={taskId} taskName="run_recipe" fieldPath="recipe_id" className="bg-inherit text-inherit"/>

                <TaskField taskId={taskId} taskName="run_recipe" fieldPath="broker_values" className="bg-inherit text-inherit"/>

                <TaskField taskId={taskId} taskName="run_recipe" fieldPath="stream" className="bg-inherit text-inherit"/>
            </div>
        </div>
    );
};

export default TaskBuilderDemo;
