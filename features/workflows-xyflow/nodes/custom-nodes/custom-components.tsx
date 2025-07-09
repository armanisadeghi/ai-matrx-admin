"use client";

import React, { useCallback, useState, useEffect } from "react";
import { NodeProps } from "@xyflow/react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { workflowNodesActions } from "@/lib/redux/workflow-nodes/slice";
import { WorkflowNode } from "@/lib/redux/workflow-nodes/types";
import UserInputSourceDialog from "../source-node/user-input/UserInputSourceDialog";
import UserDataSourceSettings from "../source-node/user-data/UserDataSourceSettings";

interface DirectInputNodeComponentProps extends Omit<NodeProps, "data"> {
    data: WorkflowNode & {
        displayMode?: "detailed" | "compact";
        onDisplayModeChange?: (mode: "detailed" | "compact") => void;
    };
}

// Component mapping for different input types
const INPUT_COMPONENTS = {
    DirectInput: Input,
    DirectTextInput: Input,
    DirectNumberInput: (props: any) => <Input {...props} type="number" />,
    DirectSwitch: Switch,
    DirectSelect: Select,
    DirectTextarea: Textarea,
    DirectButton: Button,
    // Add more components as needed
} as const;

type ComponentName = keyof typeof INPUT_COMPONENTS;

// Self-managing dialog component interface
interface DialogComponentProps {
    nodeId: string;
    inputId: string;
    inputType: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    buttonText?: string;
    dialogConfig?: Record<string, any>;
}

// Long text dialog component - self-managing with Redux
const LongTextDialog: React.FC<DialogComponentProps> = ({ 
    nodeId, 
    inputId, 
    inputType,
    isOpen, 
    onOpenChange, 
    buttonText = "Edit Text",
    dialogConfig = {}
}) => {
    const dispatch = useAppDispatch();
    
    // Get current value from Redux
    const currentValue = useAppSelector((state) => 
        workflowNodesSelectors.nodeInputValue(state, nodeId, inputId)
    );
    
    const [tempValue, setTempValue] = useState(currentValue || "");

    // Sync tempValue when dialog opens or currentValue changes
    useEffect(() => {
        if (isOpen) {
            setTempValue(currentValue || "");
        }
    }, [isOpen, currentValue]);

    const handleSave = useCallback(() => {
        dispatch(workflowNodesActions.updateInputValue({
            nodeId,
            inputId,
            value: tempValue,
            inputType
        }));
        onOpenChange(false);
    }, [dispatch, nodeId, inputId, inputType, tempValue, onOpenChange]);

    const handleCancel = useCallback(() => {
        setTempValue(currentValue || "");
        onOpenChange(false);
    }, [currentValue, onOpenChange]);

    const placeholder = dialogConfig.placeholder || "Enter text...";
    const title = dialogConfig.title || "Text Input";
    const minHeight = dialogConfig.minHeight || "200px";

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <Textarea
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        placeholder={placeholder}
                        style={{ minHeight }}
                        className="min-h-[200px]"
                    />
                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>Save</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// User Input Source Dialog Wrapper
const UserInputSourceDialogWrapper: React.FC<DialogComponentProps> = ({ 
    nodeId,
    inputId,
    inputType,
    isOpen, 
    onOpenChange, 
    buttonText,
    dialogConfig = {}
}) => {
    const dispatch = useAppDispatch();
    
    // Get workflowId from node data
    const nodeData = useAppSelector((state) => workflowNodesSelectors.nodeById(state, nodeId));
    const workflowId = nodeData?.workflow_id || "";
    
    // Get current brokerId value from Redux
    const currentBrokerId = useAppSelector((state) => 
        workflowNodesSelectors.nodeInputValue(state, nodeId, inputId)
    );
    
    const handleSuccess = useCallback(() => {
        // The dialog will handle updating the broker registry
        // We just need to close the dialog
        onOpenChange(false);
    }, [onOpenChange]);

    return (
        <UserInputSourceDialog
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            workflowId={workflowId}
            brokerId={currentBrokerId || dialogConfig.brokerId}
            onSuccess={handleSuccess}
        />
    );
};

// User Data Source Dialog Wrapper
const UserDataSourceDialogWrapper: React.FC<DialogComponentProps> = ({ 
    nodeId,
    inputId,
    inputType,
    isOpen, 
    onOpenChange, 
    buttonText,
    dialogConfig = {}
}) => {
    const dispatch = useAppDispatch();
    
    // Get workflowId from node data
    const nodeData = useAppSelector((state) => workflowNodesSelectors.nodeById(state, nodeId));
    const workflowId = nodeData?.workflow_id || "";
    
    // Get current brokerId value from Redux
    const currentBrokerId = useAppSelector((state) => 
        workflowNodesSelectors.nodeInputValue(state, nodeId, inputId)
    );
    
    const handleSuccess = useCallback(() => {
        // The dialog will handle updating the broker registry
        // We just need to close the dialog
        onOpenChange(false);
    }, [onOpenChange]);

    return (
        <UserDataSourceSettings
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            workflowId={workflowId}
            brokerId={currentBrokerId || dialogConfig.brokerId}
            onSuccess={handleSuccess}
        />
    );
};


// Dialog Registry - maps dialog types to components
export const DIALOG_REGISTRY = {
    'text': LongTextDialog,
    'textarea': LongTextDialog,
    'user-input-source': UserInputSourceDialogWrapper,
    'user-data-source': UserDataSourceDialogWrapper,
    // Add more dialog types here as needed
    // 'code': CodeEditorDialog,
    // 'json': JsonEditorDialog,
    // 'file-picker': FilePickerDialog,
} as const;

export type DialogType = keyof typeof DIALOG_REGISTRY;

