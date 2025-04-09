import React, { useEffect, useState } from "react";
import { Mic, FileAudio, CheckCircle2, Upload, ClipboardList, AudioLines, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUploadWithStorage } from "@/components/ui/file-upload/FileUploadWithStorage";
import { FileManagerReturn } from "@/hooks/ai/chat/useFileManagement";
import createChatSelectors from "@/lib/redux/entity/custom-selectors/chatSelectors";
import { useAppSelector } from "@/lib/redux";

interface MobileAudioPlanProps {
    fileManager: FileManagerReturn;
    fileCount: number;
    isUploading: boolean;
    conversationId: string;
    onTogglePlan: () => void;
    onClose?: () => void;
    onBack?: () => void;
    allowMultiple?: boolean;
}

const MobileAudioPlan: React.FC<MobileAudioPlanProps> = ({
    fileManager,
    conversationId,
    onTogglePlan,
    onClose,
    onBack,
    allowMultiple = true,
}) => {
    const chatSelectors = createChatSelectors();
    const files = chatSelectors.activeMessageFiles(useAppSelector(state => state));
    
    const handleConfirm = () => {
        
        if (files.length > 0) {
            onTogglePlan();
            
            setTimeout(() => {
                if (onClose) {
                    onClose();
                } else {
                    console.log("onClose is not available!");
                }
            }, 100);
        }
    };
    

    return (
        <>
            <div className="flex-1 overflow-y-auto py-4 px-4 bg-zinc-100 dark:bg-zinc-800">
                <div className="bg-muted/40 dark:bg-zinc-700/40 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-4 gap-2 text-center mb-4">
                        <div className="flex flex-col items-center">
                            <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-full mb-2">
                                <Mic className="h-5 w-5 text-primary" />
                            </div>
                            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Upload Audio</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-full mb-2">
                                <AudioLines className="h-5 w-5 text-primary" />
                            </div>
                            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Transcript</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-full mb-2">
                                <ClipboardList className="h-5 w-5 text-primary" />
                            </div>
                            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Plan</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-full mb-2">
                                <ListTodo className="h-5 w-5 text-primary" />
                            </div>
                            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Task List</span>
                        </div>
                    </div>
                    <FileUploadWithStorage
                        bucket="userContent"
                        path={`chat-attachments/conversation-${conversationId}`}
                        onUploadComplete={fileManager.addFiles}
                        onUploadStatusChange={fileManager.handleUploadStatusChange}
                        multiple={allowMultiple}
                        useMiniUploader={true}
                    />
                </div>
                {files.length > 0 && (
                    <div className="flex items-center gap-2 p-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-muted/20 dark:bg-zinc-700/20">
                        <FileAudio className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium truncate flex-1 text-zinc-800 dark:text-zinc-200">
                            {files[0]?.details?.filename || "Audio file uploaded"}
                        </span>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                )}
                <div className="mt-6">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">Generate structured plan from audio</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        Upload an audio file and Matrx will extract actionable steps and create a structured plan for you.
                    </div>
                </div>
            </div>
            <div className="p-4 border-t border-zinc-300 dark:border-zinc-700 flex justify-between gap-2 bg-zinc-100 dark:bg-zinc-800">
                <Button 
                    variant="outline" 
                    onClick={() => {
                        console.log("Cancel button clicked");
                        // Try onBack first, then fall back to onClose
                        if (onBack) {
                            console.log("Calling onBack");
                            onBack();
                        } else if (onClose) {
                            console.log("Calling onClose");
                            onClose();
                        } else {
                            console.log("Neither onBack nor onClose available!");
                        }
                    }} 
                    className="flex-1"
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleConfirm}
                    disabled={files.length === 0 || fileManager.isUploading}
                    className="flex-1 gap-1"
                >
                    {fileManager.isUploading ? (
                        <>
                            <Upload className="h-4 w-4 animate-pulse" />
                            Uploading...
                        </>
                    ) : (
                        "Done"
                    )}
                </Button>
            </div>
        </>
    );
};

export default MobileAudioPlan;