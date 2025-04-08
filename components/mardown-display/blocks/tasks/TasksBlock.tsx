"use client";
import React, { useState } from "react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, CheckSquare } from "lucide-react";
import TaskChecklist from "@/components/mardown-display/blocks/tasks/TaskChecklist";
import { useToast } from "@/components/ui/use-toast";

interface TasksBlockProps {
    content: string;
}

const TasksBlock: React.FC<TasksBlockProps> = ({ content }) => {
    const [isOpen, setIsOpen] = useState(true);
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
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm my-4"
        >
            <CollapsibleTrigger className="relative flex w-full items-center justify-between rounded-t-lg py-3 px-4 font-medium hover:bg-accent/50 hover:shadow-sm">
                <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-primary" />
                    <span>Task Checklist</span>
                </div>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
            </CollapsibleTrigger>
            <CollapsibleContent className="bg-transparent dark:bg-transparent overflow-hidden data-[state=open]:animate-slide-down data-[state=closed]:animate-slide-up">
                <div className="p-2 bg-transparent dark:bg-transparent">
                    <TaskChecklist
                        content={content}
                        initialState={checkboxState}
                        onStateChange={setCheckboxState}
                        onSave={handleSaveState}
                        hideTitle={true}
                    />
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
};

export default TasksBlock;