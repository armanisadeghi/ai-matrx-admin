"use client";

import React, { memo, useCallback, useState, useMemo, useEffect } from "react";
import { NodeProps, useNodeId } from "@xyflow/react";
import { BaseNode, NodeConfig } from "../base/BaseNode";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { workflowNodesActions } from "@/lib/redux/workflow-nodes/slice";
import { WorkflowNode } from "@/lib/redux/workflow-nodes/types";
import { NodeEditorOne } from "../wf-nodes/FlexibleNodeEditor";
import { toTitleCase } from "@/utils/dataUtils";
import { NodeInput } from "../base/NodeHandles";

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

// Legacy dialog component for backwards compatibility
const LegacyLongTextDialog: React.FC<{
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    buttonText?: string;
}> = ({ value, onChange, placeholder = "Enter text...", buttonText = "Edit Text" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    // Sync tempValue with value when dialog opens
    const handleOpenChange = useCallback(
        (open: boolean) => {
            if (open) {
                setTempValue(value);
            }
            setIsOpen(open);
        },
        [value]
    );

    const handleSave = useCallback(() => {
        onChange(tempValue);
        setIsOpen(false);
    }, [tempValue, onChange]);

    const handleCancel = useCallback(() => {
        setTempValue(value);
        setIsOpen(false);
    }, [value]);

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-5 text-xs px-1.5 py-0.5 w-full">
                    {value ? buttonText : "Add Text"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Text Input</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <Textarea
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        placeholder={placeholder}
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

// Dialog Registry - maps dialog types to components
const DIALOG_REGISTRY = {
    'text': LongTextDialog,
    'textarea': LongTextDialog,
    // Add more dialog types here as needed
    // 'code': CodeEditorDialog,
    // 'json': JsonEditorDialog,
    // 'file-picker': FilePickerDialog,
} as const;

type DialogType = keyof typeof DIALOG_REGISTRY;

// Extended NodeInput type for dialog configuration
type DialogNodeInput = NodeInput & { 
    dialogType?: string; 
    dialogConfig?: Record<string, any> 
};

// Smart button component that uses dialog registry
const SmartDialogButton: React.FC<{
    nodeId: string;
    input: DialogNodeInput;
}> = ({ nodeId, input }) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    // Get current value to determine button text
    const currentValue = useAppSelector((state) => 
        workflowNodesSelectors.nodeInputValue(state, nodeId, input.id)
    );
    
    // Determine which dialog to use
    const dialogType = (input.dialogType || 'text') as DialogType;
    const DialogComponent = DIALOG_REGISTRY[dialogType];
    
    if (!DialogComponent) {
        console.error(`Dialog type "${dialogType}" not found in registry`);
        return <div className="text-red-500 text-xs">Invalid dialog type: {dialogType}</div>;
    }
    
    const buttonText = currentValue 
        ? `Edit ${input.name}` 
        : `Add ${input.name}`;
    
    return (
        <>
            <Button 
                variant="outline" 
                size="sm" 
                className="h-5 text-xs px-1.5 py-0.5 w-full"
                onClick={() => setIsDialogOpen(true)}
            >
                {buttonText}
            </Button>
            
            <DialogComponent
                nodeId={nodeId}
                inputId={input.id}
                inputType={input.input_type}
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                buttonText={buttonText}
                dialogConfig={input.dialogConfig}
            />
        </>
    );
};

// Individual input renderer with local state to prevent focus loss
// Uses local state for immediate updates and syncs to Redux on blur
const DirectInputField: React.FC<{
    nodeId: string;
    input: NodeInput;
}> = memo(({ nodeId, input }) => {
    const dispatch = useAppDispatch();
    
    // Get the initial value from Redux state
    const reduxValue = useAppSelector((state) => 
        workflowNodesSelectors.nodeInputValue(state, nodeId, input.id)
    );
    
    // Local state to prevent focus loss on each keystroke
    const [localValue, setLocalValue] = useState(reduxValue || "");
    
    // Sync local state with Redux when Redux value changes (on mount/external changes)
    useEffect(() => {
        setLocalValue(reduxValue || "");
    }, [reduxValue]);
    
    // Update Redux on blur to persist the value
    const handleBlur = useCallback(() => {
        if (localValue !== reduxValue) {
            dispatch(workflowNodesActions.updateInputValue({
                nodeId,
                inputId: input.id,
                value: localValue,
                inputType: input.input_type
            }));
        }
    }, [dispatch, nodeId, input.id, input.input_type, localValue, reduxValue]);
    
    // Handle local value changes (immediate UI updates)
    const onChange = useCallback((newValue: any) => {
        setLocalValue(newValue);
    }, []);
    const componentName = input.component as ComponentName;

    const renderComponent = () => {
        switch (componentName) {
            case "DirectSwitch":
                return (
                    <Switch
                        checked={localValue || false}
                        onCheckedChange={(checked) => {
                            onChange(checked);
                            // Immediately sync to Redux for switch changes
                            dispatch(workflowNodesActions.updateInputValue({
                                nodeId,
                                inputId: input.id,
                                value: checked,
                                inputType: input.input_type
                            }));
                        }}
                        className="h-2.5 w-5 [&>*]:h-2 [&>*]:w-2 [&>*]:data-[state=checked]:translate-x-2.5"
                    />
                );

            case "DirectSelect":
                return (
                    <Select value={localValue || ""} onValueChange={(newValue) => {
                        onChange(newValue);
                        // Immediately sync to Redux for select changes
                        dispatch(workflowNodesActions.updateInputValue({
                            nodeId,
                            inputId: input.id,
                            value: newValue,
                            inputType: input.input_type
                        }));
                    }}>
                        <SelectTrigger className="h-5 text-xs px-1.5 py-0.5">
                            <SelectValue placeholder={`Select ${input.name}`} />
                        </SelectTrigger>
                        <SelectContent>
                            {input.options?.map((option: any) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            )) || (
                                <SelectItem value="" disabled>
                                    No options available
                                </SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                );

            case "DirectTextarea":
                return (
                    <LegacyLongTextDialog
                        value={localValue || ""}
                        onChange={(newValue) => {
                            onChange(newValue);
                            // Immediately sync to Redux for dialog changes
                            dispatch(workflowNodesActions.updateInputValue({
                                nodeId,
                                inputId: input.id,
                                value: newValue,
                                inputType: input.input_type
                            }));
                        }}
                        placeholder={`Enter ${input.name}`}
                        buttonText={`Edit ${input.name}`}
                    />
                );

            case "DirectButton":
                return (
                    <SmartDialogButton
                        nodeId={nodeId}
                        input={input}
                    />
                );

            case "DirectNumberInput":
                return (
                    <Input
                        type="number"
                        value={localValue || ""}
                        onChange={(e) => onChange(Number(e.target.value) || 0)}
                        onBlur={handleBlur}
                        placeholder={input.name}
                        className="h-5 text-xs px-1.5 py-0.5 w-full"
                    />
                );

            default:
                return (
                    <Input
                        value={localValue || ""}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={handleBlur}
                        placeholder={input.name}
                        className="h-5 text-xs px-1.5 py-0.5 w-full"
                    />
                );
        }
    };

    return <div className="flex items-center mb-0.5 p-0.5">{renderComponent()}</div>;
});

// Main content component for the node
const DirectInputContent: React.FC<{ nodeId: string }> = memo(({ nodeId }) => {
    const nodeData = useAppSelector((state) => workflowNodesSelectors.nodeById(state, nodeId || ""));

    const inputHandles = useMemo(() => {
        const nodeDefinition = nodeData?.metadata?.nodeDefinition;
        const inputs = (nodeDefinition?.inputs || []) as NodeInput[];

        return [...inputs].sort((a, b) => {
            if (a.input_type === "broker" && b.input_type !== "broker") return -1;
            if (a.input_type !== "broker" && b.input_type === "broker") return 1;
            return 0;
        });
    }, [nodeId]); // Only depend on nodeId since node definition never changes

    if (!nodeData || !inputHandles.length) {
        return <div className="text-xs text-muted-foreground p-2">No inputs defined</div>;
    }

    return (
        <div className="space-y-0.5 p-0.5 w-full">
            {inputHandles.map((input) => (
                <DirectInputField
                    key={input.id}
                    nodeId={nodeId}
                    input={input}
                />
            ))}
        </div>
    );
});

// Settings component wrapper for NodeEditorOne
const DirectInputSettings: React.FC<{
    nodeId: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}> = ({ nodeId, isOpen, onOpenChange }) => {
    return <NodeEditorOne nodeId={nodeId} isOpen={isOpen} onOpenChange={onOpenChange} />;
};

const DirectInputNodeComponent: React.FC<DirectInputNodeComponentProps> = (props) => {
    const nodeId = useNodeId();
    const nodeData = useAppSelector((state) => workflowNodesSelectors.nodeById(state, nodeId || ""));

    if (!nodeId) {
        console.error("DirectInputNode: nodeId is required");
        return null;
    }

    // Enhanced handle connection validation - specific to workflow nodes
    const isValidConnection = useCallback((connection: any) => {
        // Prevent self-connections
        if (connection.source === connection.target) return false;

        // Add custom validation logic based on handle types
        const sourceHandle = connection.sourceHandle;
        const targetHandle = connection.targetHandle;

        // Example: Only allow data outputs to connect to data inputs
        if (sourceHandle?.includes("data") && !targetHandle?.includes("data")) {
            return false;
        }

        return true;
    }, []);

    // Configuration for direct input nodes
    const directInputConfig: NodeConfig = {
        // Core node settings
        nodeType: "direct-input",
        displayText: nodeData?.step_name || "Direct Input",

        // Enhanced connection validation
        isValidConnection,

        // Custom detailed content - renders input components instead of text labels
        DetailedContent: () => <DirectInputContent nodeId={nodeId} />,

        // Settings modal - use NodeEditorOne (same as WorkflowNode)
        SettingsComponent: DirectInputSettings,

        // Use workflow-specific Redux actions
        useWorkflowActions: true,

        // Allow compact mode
        allowCompactMode: true,

        // Custom styling for more compact inputs
        customStyles: {
            contentClass: "pt-0.5",
        },
    };

    return <BaseNode config={directInputConfig} {...props} />;
};

// Export memoized component for performance
export const DirectInputNode = memo(DirectInputNodeComponent);
