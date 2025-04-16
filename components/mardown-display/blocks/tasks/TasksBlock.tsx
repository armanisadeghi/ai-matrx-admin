"use client";
import React, { useState } from "react";
import { CheckSquare } from "lucide-react";
import TaskChecklist from "@/components/mardown-display/blocks/tasks/TaskChecklist";
import { useToast } from "@/components/ui/use-toast";
import ChatCollapsibleWrapper from "@/components/mardown-display/blocks/ChatCollapsibleWrapper";

interface TasksBlockProps {
    content: string;
}

const TasksBlock: React.FC<TasksBlockProps> = ({ content }) => {
    const [checkboxState, setCheckboxState] = useState({});
    const { toast } = useToast();

    const handleSaveState = (state: any) => {
        setCheckboxState(state);
        toast({
            title: "Tasks saved",
            description: "Your task progress has been saved successfully",
        });
    };

    return (
        <ChatCollapsibleWrapper
            icon={<CheckSquare className="h-4 w-4 text-primary" />}
            title="Task Checklist"
        >
            <TaskChecklist
                content={content}
                initialState={checkboxState}
                onStateChange={setCheckboxState}
                onSave={handleSaveState}
                hideTitle={true}
            />
        </ChatCollapsibleWrapper>
    );
};

export default TasksBlock;