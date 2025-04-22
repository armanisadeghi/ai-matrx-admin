"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToastManager } from "@/hooks/useToastManager";
import { SocketManager } from "@/lib/redux/socket/SocketManager";
import UserTableViewer from "@/components/user-generated-table-data/UserTableViewer";
import { Loader2, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";

interface SaveTableResponse {
  table_id: string;
  table_name: string;
  original_name: string;
  row_count: string;
  field_count: string;
  success: string;
  existing: string;
}

interface SaveTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveComplete?: (tableInfo: SaveTableResponse) => void;
  tableData: any;
}

const SaveTableModal: React.FC<SaveTableModalProps> = ({ 
  isOpen, 
  onClose, 
  onSaveComplete,
  tableData 
}) => {
  const [tableName, setTableName] = useState("");
  const [tableDescription, setTableDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveResponse, setSaveResponse] = useState<SaveTableResponse | null>(null);
  const [stage, setStage] = useState<"form" | "saving" | "result">("form");
  const [isLoading, setIsLoading] = useState(false);
  

  console.log(JSON.stringify(tableData, null, 2));

  const socketManager = SocketManager.getInstance();
  const toast = useToastManager();
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const responseReceivedRef = useRef(false);

  // Define loading states based on table complexity
  const getLoadingStates = () => {
    const rowCount = Array.isArray(tableData) ? tableData.length : 10;
    const baseMessages = [
      { text: "Initializing table structure..." },
      { text: "Analyzing data patterns..." },
      { text: "Optimizing columns and rows..." },
      { text: "Creating database entries..." },
      { text: "Generating table metadata..." },
      { text: "Setting up data relationships..." },
      { text: "Finalizing table creation..." },
      { text: "Almost there! Preparing your table..." }
    ];
    
    // For larger tables, add more detailed steps
    if (rowCount > 20) {
      baseMessages.splice(3, 0, { text: "Processing data records..." });
      baseMessages.splice(5, 0, { text: "Validating data integrity..." });
    }
    
    if (rowCount > 50) {
      baseMessages.splice(2, 0, { text: "Optimizing for large dataset..." });
      baseMessages.splice(7, 0, { text: "Running performance checks..." });
    }
    
    return baseMessages;
  };

  // Clear safety timeout on unmount
  useEffect(() => {
    return () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
    };
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Add a delay before resetting to avoid flashing content during close animation
      const timeout = setTimeout(() => {
        if (stage !== "form") {
          setStage("form");
        }
        if (!saveResponse) {
          setTableName("");
          setTableDescription("");
        }
        setIsSaving(false);
        setIsLoading(false);
      }, 300);
      
      return () => clearTimeout(timeout);
    }
  }, [isOpen, stage, saveResponse]);

  const handleSave = async () => {
    if (!tableName.trim()) {
      toast.error("Table name is required");
      return;
    }

    // Always clear any previous timeout when starting a new save
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    setIsSaving(true);
    setStage("saving");
    setIsLoading(true);
    console.log("Starting direct socket save process");

    try {
      // Prepare task payload in the format expected by socketManager
      const payload = [{
        task: "convert_normalized_data_to_user_data",
        index: 0,
        stream: true,
        taskData: {
          data: tableData,
          table_name: tableName,
          table_description: tableDescription
        }
      }];

      console.log("Prepared task payload:", payload);
      
      // Reset the response received flag
      responseReceivedRef.current = false;
      
      // Call socketManager directly with the properly structured payload
      await socketManager.startTask("ai_chat_service", payload, (response) => {
        // Mark that we received a response
        responseReceivedRef.current = true;
        
        console.log("Socket response received:", response);
        
        // IMPORTANT: The response format we're getting has table_id directly at the top level
        // It looks like: {table_id: '123', table_name: 'Name', row_count: '10', ...}
        
        try {
          // Most important: Check for the exact format we're seeing in logs
          if (response && typeof response === 'object' && response.table_id) {
            console.log("Found table_id in response:", response.table_id);
            setSaveResponse(response);
            setStage("result");
            setIsSaving(false);
            setIsLoading(false);
            
            // Clear safety timeout
            if (safetyTimeoutRef.current) {
              clearTimeout(safetyTimeoutRef.current);
              safetyTimeoutRef.current = null;
            }
            
            toast.success(`Table "${response.table_name || tableName}" created successfully`);
            
            // Call the onSaveComplete callback if provided
            if (onSaveComplete) {
              onSaveComplete(response);
            }
            
            return;
          }
          
          // For other cases, fallback to the generic handler
          if (response?.error) {
            console.error("Error from socket:", response.error);
            toast.error(`Failed to save table: ${response.error}`);
            setStage("form");
            setIsSaving(false);
            setIsLoading(false);
            return;
          }
          
          // Handle other response formats as a backup
          let tableData = null;
          
          if (response?.data?.table_id) {
            tableData = response.data;
          } else if (typeof response === 'string') {
            try {
              const parsed = JSON.parse(response);
              if (parsed?.table_id) tableData = parsed;
              else if (parsed?.data?.table_id) tableData = parsed.data;
            } catch (e) {}
          }
          
          if (tableData) {
            console.log("Found table data in alternate format:", tableData);
            setSaveResponse(tableData);
            setStage("result");
            setIsSaving(false);
            setIsLoading(false);
            
            // Clear safety timeout
            if (safetyTimeoutRef.current) {
              clearTimeout(safetyTimeoutRef.current);
              safetyTimeoutRef.current = null;
            }
            
            toast.success(`Table "${tableData.table_name || tableName}" created successfully`);
            
            // Call the onSaveComplete callback if provided
            if (onSaveComplete) {
              onSaveComplete(tableData);
            }
          }
          
        } catch (err) {
          console.error("Error processing response:", err);
        }
      });
      
      // Set a safety timeout to prevent the spinner from running forever
      safetyTimeoutRef.current = setTimeout(() => {
        console.log("Safety timeout reached after 20 seconds");
        console.log("Got any response?", responseReceivedRef.current);
        
        if (stage === "saving") {
          setStage("form");
          setIsSaving(false);
          setIsLoading(false);
          toast.info("Table creation is still processing in the background");
        }
        
        safetyTimeoutRef.current = null;
      }, 20000); // Extend timeout to 20 seconds for larger tables
      
    } catch (error) {
      console.error("Error in save process:", error);
      toast.error("Failed to save table data");
      setStage("form");
      setIsSaving(false);
      setIsLoading(false);
      
      // Clear the safety timeout on error
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    }
  };

  const handleOpenInNewTab = () => {
    if (saveResponse?.table_id) {
      window.open(`/data/${saveResponse.table_id}`, '_blank');
    }
  };

  const resetForm = () => {
    setSaveResponse(null);
    setStage("form");
    setTableName("");
    setTableDescription("");
  };

  // When clicking Done in the result view, notify parent with the saved table info
  const handleDone = () => {
    if (saveResponse && onSaveComplete) {
      onSaveComplete(saveResponse);
    }
    onClose();
  };

  const renderFormContent = () => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="table-name" className="text-gray-700 dark:text-gray-300">
          Table Name*
        </Label>
        <Input
          id="table-name"
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          placeholder="Enter table name"
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
          disabled={isSaving}
        />
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="table-description" className="text-gray-700 dark:text-gray-300">
          Description (optional)
        </Label>
        <Textarea
          id="table-description"
          value={tableDescription}
          onChange={(e) => setTableDescription(e.target.value)}
          placeholder="Enter table description"
          rows={3}
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 resize-none"
          disabled={isSaving}
        />
      </div>
    </div>
  );

  // No longer needed - replaced by MultiStepLoader
  const renderSavingContent = () => null;

  const renderResultContent = () => saveResponse && (
    <div className="py-0">
      <div className="mb-1 text-left text-sm text-gray-600 dark:text-gray-400 pb-1">
        Your new table was created with {saveResponse.row_count} rows and {saveResponse.field_count} fields per row.
      </div>
      
      <div className="h-[calc(85vh-140px)] overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <UserTableViewer tableId={saveResponse.table_id} showTableSelector={false} />
      </div>
    </div>
  );

  const renderDialogContent = () => {
    switch (stage) {
      case "saving":
        return null; // Content is replaced by the MultiStepLoader
      case "result":
        return renderResultContent();
      default:
        return renderFormContent();
    }
  };
  
  const renderDialogFooter = () => {
    switch (stage) {
      case "saving":
        return (
          <Button
            variant="outline"
            onClick={() => {
              setIsLoading(false);
              toast.info("Save operation is continuing in the background");
              onClose();
            }}
            className="text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700"
          >
            Close
          </Button>
        );
      case "result":
        return (
          <div className="flex justify-end w-full gap-2">
            <Button
              variant="outline"
              onClick={handleOpenInNewTab}
              className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/30 border border-blue-300 dark:border-blue-700"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
            <Button
              variant="default"
              onClick={handleDone}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
            >
              Done
            </Button>
          </div>
        );
      default:
        return (
          <>
            <Button
              variant="outline"
              onClick={onClose}
              className="text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
            >
              {isSaving ? "Saving..." : "Save Table"}
            </Button>
          </>
        );
    }
  };

  return (
    <>
      <Dialog 
        open={isOpen} 
        onOpenChange={(open) => {
          if (!open) {
            if (stage === "saving") {
              setIsLoading(false);
              toast.info("Save operation is continuing in the background");
            }
            onClose();
          }
        }}
      >
        <DialogContent className={cn(
          "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden",
          stage === "result" 
            ? "max-w-[95vw] w-[95vw] h-[90vh] p-3 border-3 border-gray-200 dark:border-gray-700 rounded-3xl" 
            : "sm:max-w-[425px] p-6"
        )}>
          <DialogHeader className={cn(
            "flex flex-row items-center justify-between",
            stage === "result" ? "mb-1" : "mb-2"
          )}>
            <DialogTitle className="text-xl font-semibold">
              {stage === "saving" ? "Creating Table" : 
               stage === "result" ? "" : 
               "Save Table"}
            </DialogTitle>
          </DialogHeader>
          
          {renderDialogContent()}
          
          <DialogFooter className={cn(
            "flex items-center gap-2",
            stage === "result" ? "mt-2 pt-2" : "mt-4"
          )}>
            {renderDialogFooter()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multi-step loader outside the dialog */}
      <MultiStepLoader 
        loadingStates={getLoadingStates()} 
        loading={isLoading} 
        duration={600} 
        loop={false}
      />
    </>
  );
};

export default SaveTableModal; 