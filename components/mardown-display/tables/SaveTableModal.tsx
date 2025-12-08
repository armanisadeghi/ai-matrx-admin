"use client";

import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToastManager } from "@/hooks/useToastManager";
import UserTableViewer from "@/components/user-generated-table-data/UserTableViewer";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectTaskStatus, selectPrimaryResponseEndedByTaskId, selectFirstPrimaryResponseDataByTaskId } from "@/lib/redux/socket-io";
import { createTask, submitTask } from "@/lib/redux/socket-io/thunks";
import { updateTaskField, setTaskFields } from "@/lib/redux/socket-io/slices/socketTasksSlice";
import { v4 as uuidv4 } from "uuid";

const getLoadingStates = (tableData: any) => {
    const rowCount = Array.isArray(tableData) ? tableData.length : 10;
    const baseMessages = [
        { text: "Initializing table structure..." },
        { text: "Analyzing data patterns..." },
        { text: "Optimizing columns and rows..." },
        { text: "Creating database entries..." },
        { text: "Generating table metadata..." },
        { text: "Setting up data relationships..." },
        { text: "Finalizing table creation..." },
        { text: "Almost there! Preparing your table..." },
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

interface SaveTableResponse {
    table_id: string;
    table_name: string;
    original_name: string;
    row_count: string;
    field_count: string;
    success: string;
    existing: string;
    fields?: any[];
}

interface SaveTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveComplete?: (tableInfo: SaveTableResponse) => void;
    tableData: any;
}

const SaveTableModal: React.FC<SaveTableModalProps> = ({ isOpen, onClose, onSaveComplete, tableData }) => {
    const dispatch = useAppDispatch();
    const [tableName, setTableName] = useState("");
    const [tableDescription, setTableDescription] = useState("");
    const [stage, setStage] = useState<"form" | "saving" | "result">("form");
    const [saveResponse, setSaveResponse] = useState<SaveTableResponse | null>(null);

    // Create a task ID on initial render
    const [taskId] = useState(() => uuidv4());

    // Select task-related information from Redux store
    const taskStatus = useAppSelector((state) => selectTaskStatus(state, taskId));
    const isTaskCompleted = useAppSelector((state) => selectPrimaryResponseEndedByTaskId(taskId)(state));
    const tableResponse = useAppSelector((state) => selectFirstPrimaryResponseDataByTaskId(taskId)(state)) as SaveTableResponse;
    const toast = useToastManager();
    const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize the task on component mount
    useEffect(() => {
        if (isOpen) {
            dispatch(
                createTask({
                    taskId,
                    service: "ai_chat_service",
                    taskName: "convert_normalized_data_to_user_data",
                })
            );

            // Set the initial table data
            dispatch(
                setTaskFields({
                    taskId,
                    fields: {
                        data: tableData,
                    },
                })
            );
        }
    }, [dispatch, isOpen, taskId, tableData]);

    // Effect to update the task fields when the user changes the form
    useEffect(() => {
        if (taskId && tableName) {
            dispatch(
                updateTaskField({
                    taskId,
                    field: "table_name",
                    value: tableName,
                })
            );
        }
    }, [dispatch, taskId, tableName]);

    useEffect(() => {
        if (taskId && tableDescription) {
            dispatch(
                updateTaskField({
                    taskId,
                    field: "table_description",
                    value: tableDescription,
                })
            );
        }
    }, [dispatch, taskId, tableDescription]);

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
            }, 300);

            return () => clearTimeout(timeout);
        }
    }, [isOpen, stage, saveResponse]);

    // Effect to process response data when it changes
    useEffect(() => {
        if (tableResponse && tableResponse.table_id && stage === "saving") {
            setSaveResponse(tableResponse);
            setStage("result");

            // Clear safety timeout
            if (safetyTimeoutRef.current) {
                clearTimeout(safetyTimeoutRef.current);
                safetyTimeoutRef.current = null;
            }

            toast.success(`Table "${tableResponse.table_name || tableName}" created successfully`);

            // Call the onSaveComplete callback if provided
            if (onSaveComplete) {
                onSaveComplete(tableResponse as SaveTableResponse);
            }
        }
    }, [tableResponse, isTaskCompleted, stage, tableName, toast, onSaveComplete]);

    // Handle save button click
    const handleSave = () => {
        if (!tableName.trim()) {
            toast.error("Table name is required");
            return;
        }

        if (!tableDescription.trim()) {
            toast.error("Table description is required");
            return;
        }

        // Don't allow submission if already in progress
        if (taskStatus === "submitted" || taskStatus === "completed") {
            return;
        }

        // Always clear any previous timeout when starting a new save
        if (safetyTimeoutRef.current) {
            clearTimeout(safetyTimeoutRef.current);
            safetyTimeoutRef.current = null;
        }

        setStage("saving");

        dispatch(submitTask({ taskId }));

        safetyTimeoutRef.current = setTimeout(() => {
            if (stage === "saving") {
                setStage("form");
                toast.info("Table creation is still processing in the background");
            }

            safetyTimeoutRef.current = null;
        }, 20000); // 20 seconds timeout for larger tables
    };

    const handleOpenInNewTab = () => {
        if (saveResponse?.table_id) {
            window.open(`/data/${saveResponse.table_id}`, "_blank");
        }
    };

    const handleDone = () => {
        if (saveResponse && onSaveComplete) {
            onSaveComplete(saveResponse);
        }
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && tableName.trim() && tableDescription.trim() && stage === "form") {
            e.preventDefault();
            handleSave();
        }
    };

    const isLoading = taskStatus === "submitted" || stage === "saving";

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
                    className="border border-gray-300 dark:border-gray-700 bg-textured"
                    disabled={isLoading}
                    onKeyDown={handleKeyDown}
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="table-description" className="text-gray-700 dark:text-gray-300">
                    Description*
                </Label>
                <Textarea
                    id="table-description"
                    value={tableDescription}
                    onChange={(e) => setTableDescription(e.target.value)}
                    placeholder="Enter table description"
                    rows={3}
                    className="border border-gray-300 dark:border-gray-700 bg-textured resize-none"
                    disabled={isLoading}
                    onKeyDown={handleKeyDown}
                />
            </div>
        </div>
    );

    const renderResultContent = () =>
        saveResponse && (
            <div className="py-0">
                <div className="mb-1 text-left text-sm text-gray-600 dark:text-gray-400 pb-1">
                    Your new table was created with {saveResponse.row_count} rows and {saveResponse.field_count} fields per row.
                </div>

                <div className="h-[calc(85vh-140px)] overflow-auto border-border rounded-lg bg-textured">
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
                            disabled={isLoading || !tableName.trim() || !tableDescription.trim()}
                            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Saving..." : "Save Table"}
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
                            toast.info("Save operation is continuing in the background");
                        }
                        onClose();
                    }
                }}
            >
                <DialogContent
                    className={cn(
                        "bg-textured text-gray-900 dark:text-gray-100 overflow-hidden",
                        stage === "result"
                            ? "max-w-[95vw] w-[95vw] h-[90vh] p-3 border-3 border-gray-200 dark:border-gray-700 rounded-3xl"
                            : "sm:max-w-[425px] p-6"
                    )}
                >
                    <DialogHeader className={cn("flex flex-row items-center justify-between", stage === "result" ? "mb-1" : "mb-2")}>
                        <DialogTitle className="text-xl font-semibold">
                            {stage === "saving" ? "Creating Table" : stage === "result" ? "" : "Save Table"}
                        </DialogTitle>
                    </DialogHeader>

                    {renderDialogContent()}

                    <DialogFooter className={cn("flex items-center gap-2", stage === "result" ? "mt-2 pt-2" : "mt-4")}>
                        {renderDialogFooter()}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Multi-step loader outside the dialog */}
            <MultiStepLoader loadingStates={getLoadingStates(tableData)} loading={isLoading} duration={600} loop={false} />
        </>
    );
};

export default SaveTableModal;
