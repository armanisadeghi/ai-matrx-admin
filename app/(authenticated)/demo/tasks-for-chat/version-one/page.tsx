'use client';
import TaskChecklist from "@/components/mardown-display/blocks/tasks/TaskChecklist";
import AdvancedTranscriptViewer from "@/components/mardown-display/blocks/transcripts/AdvancedTranscriptViewer";
import { sampleContent, sampleContentThree } from "../sample-content";
import { useEffect, useState } from "react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, FileText, CheckSquare } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function TasksForChat() {
    const [fullContent, setFullContent] = useState("");
    const [transcriptContent, setTranscriptContent] = useState("");
    const [taskContent, setTaskContent] = useState("");
    const [isTranscriptOpen, setIsTranscriptOpen] = useState(true);
    const [isTasksOpen, setIsTasksOpen] = useState(true);
    const [checkboxState, setCheckboxState] = useState({});
    const { toast } = useToast();
    const content = sampleContentThree;
    
    useEffect(() => {
        setFullContent(content);
        
        // Extract the transcript part
        try {
            const transcriptMatch = content.match(/```transcript\s*([\s\S]*?)\s*```/);
            if (transcriptMatch && transcriptMatch[0]) {
                setTranscriptContent(transcriptMatch[0]);
            }
        } catch (error) {
            console.error("Error extracting transcript:", error);
        }
        
        // Extract the tasks part
        try {
            const tasksMatch = content.match(/```tasks\s*([\s\S]*?)\s*```/);
            if (tasksMatch && tasksMatch[1]) {
                setTaskContent(tasksMatch[1]);
            }
        } catch (error) {
            console.error("Error extracting tasks:", error);
        }
    }, []);
    
    const handleSaveState = (state) => {
        setCheckboxState(state);
        toast({
            title: "Tasks saved",
            description: "Your task progress has been saved successfully",
        });
    };
    
    const handleCopySegment = (text) => {
        toast({
            title: "Copied to clipboard",
            description: "The transcript segment has been copied to your clipboard",
        });
    };
    
    const handleTimeClick = (seconds) => {
        toast({
            title: "Time selected",
            description: `Jumped to ${Math.floor(seconds/60)}:${(seconds%60).toString().padStart(2, '0')} in the audio`,
        });
    };
    
    return (
        <div className="flex justify-center items-center min-h-screen p-4">
            <div className="max-w-3xl w-full space-y-4">
                {/* Transcript Collapsible */}
                <Collapsible 
                    open={isTranscriptOpen} 
                    onOpenChange={setIsTranscriptOpen} 
                    className="border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm"
                >
                    <CollapsibleTrigger className="relative flex w-full items-center justify-between rounded-t-lg py-3 px-4 font-medium hover:bg-accent/50 hover:shadow-sm">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span>Transcript</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isTranscriptOpen ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden data-[state=open]:animate-slide-down data-[state=closed]:animate-slide-up">
                        <div className="p-2">
                            {transcriptContent && (
                                <AdvancedTranscriptViewer 
                                    content={transcriptContent}
                                    hideTitle={false}
                                    onTimeClick={handleTimeClick}
                                    onCopySegment={handleCopySegment}
                                />
                            )}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
                
                {/* Tasks Collapsible */}
                <Collapsible 
                    open={isTasksOpen} 
                    onOpenChange={setIsTasksOpen} 
                    className="border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm"
                >
                    <CollapsibleTrigger className="relative flex w-full items-center justify-between rounded-t-lg py-3 px-4 font-medium hover:bg-accent/50 hover:shadow-sm">
                        <div className="flex items-center gap-2">
                            <CheckSquare className="h-4 w-4 text-primary" />
                            <span>Task Checklist</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isTasksOpen ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden data-[state=open]:animate-slide-down data-[state=closed]:animate-slide-up">
                        <div className="p-2">
                            {taskContent && (
                                <TaskChecklist 
                                    content={taskContent} 
                                    initialState={checkboxState}
                                    onStateChange={setCheckboxState}
                                    onSave={handleSaveState}
                                    hideTitle={true}
                                />
                            )}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>
        </div>
    );
}