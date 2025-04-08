import React, { useState } from "react";
import ToggleButton from "@/components/matrx/toggles/ToggleButton";
import { MdOutlineChecklist } from "react-icons/md";
import { 
  ListTodo, 
  Mic, 
  FileAudio, 
  CheckCircle2, 
  Upload, 
  ClipboardList, 
  AudioLines,
  ListTodoIcon
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUploadWithStorage } from "@/components/ui/file-upload/FileUploadWithStorage";
import { FileManager } from "@/hooks/ai/chat/useFileManagement";

interface AudioPlanDialogButtonProps {
  isEnabled: boolean;
  onClick: () => void;
  disabled?: boolean;
  fileManager: FileManager;
  conversationId: string;
}

const AudioPlanDialogButton: React.FC<AudioPlanDialogButtonProps> = ({
  isEnabled,
  onClick,
  disabled = false,
  fileManager,
  conversationId,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const handleButtonClick = () => {
    setIsDialogOpen(true);
  };
  
  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };
  
  const handleConfirm = () => {
    setIsDialogOpen(false);
    // Trigger the same action as the original button
    onClick();
  };

  return (
    <>
      <ToggleButton
        isEnabled={isEnabled}
        onClick={handleButtonClick}
        disabled={disabled}
        label=""
        defaultIcon={<MdOutlineChecklist />}
        enabledIcon={<ListTodo />}
        tooltip="Create Structured Plan Using Audio"
      />
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-background">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-2 text-primary">
              <AudioLines className="h-6 w-6" />
              <DialogTitle>Create Structured Plan</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Transform words into actions with Matrx Superpowers
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-muted/40 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-4 gap-2 text-center mb-4">
                <div className="flex flex-col items-center">
                  <div className="bg-primary/10 p-2 rounded-full mb-2">
                    <Mic className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium">Upload Audio</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="bg-primary/10 p-2 rounded-full mb-2">
                    <AudioLines className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium">Transcript</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="bg-primary/10 p-2 rounded-full mb-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium">Plan</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="bg-primary/10 p-2 rounded-full mb-2">
                    <ListTodoIcon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium">Task List</span>
                </div>
              </div>
              
              <FileUploadWithStorage
                bucket="userContent"
                path={`chat-attachments/conversation-${conversationId}`}
                onUploadComplete={fileManager.addFiles}
                onUploadStatusChange={fileManager.handleUploadStatusChange}
                multiple={false}
                useMiniUploader={true}
                //   accept=".mp3,.wav,.m4a,.ogg"
              />
            </div>
            
            {fileManager.files.length > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/20">
                <FileAudio className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium truncate flex-1">
                  {fileManager.files[0]?.details?.filename || "Audio file uploaded"}
                </span>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-between sm:justify-between gap-2">
            <Button 
              variant="outline" 
              onClick={handleDialogClose}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            
            <Button 
              onClick={handleConfirm}
              disabled={fileManager.files.length === 0 || fileManager.isUploading}
              className="flex-1 sm:flex-none gap-1"
            >
              {fileManager.isUploading ? (
                <>
                  <Upload className="h-4 w-4 animate-pulse" />
                  Uploading...
                </>
              ) : (
                <>
                  Done
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AudioPlanDialogButton;