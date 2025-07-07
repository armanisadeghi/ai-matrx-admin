import React from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { workflowNodesActions } from "@/lib/redux/workflow-nodes/slice";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { ALL_HIDDEN_CONNECTIONS, generateNodeInputs } from "@/features/workflows-xyflow/utils";
import DataTypeInput from "./common/DataTypeInput";
import { SectionContainer } from "./common";
import { DefaultTabProps } from "./types";
import { toTitleCase } from "@/utils/dataUtils";

const InputEditor: React.FC<DefaultTabProps> = ({ nodeId }) => {
    const inputs = useAppSelector((state) => workflowNodesSelectors.nodeInputs(state, nodeId));
    const nodeData = useAppSelector((state) => workflowNodesSelectors.nodeById(state, nodeId || ""));

    const registeredFunction = nodeData?.metadata?.registered_function;

    const dispatch = useAppDispatch();
    const hiddenArgNames = ALL_HIDDEN_CONNECTIONS;

    const typeOptions = [
        { value: "arg_override", label: "Direct Value" },
        { value: "arg_mapping", label: "Get From Input" },
        { value: "broker", label: "Use Environment Broker" },
        { value: "other", label: "Other" },
    ];

    // Mapping from Python types to user-friendly names
    const typeDisplayMap = {
        str: "Text",
        list: "List",
        dict: "Dictionary Object",
        bool: "True/False",
        int: "Number without Decimals",
        float: "Number with Decimals",
        url: "URL",
        unknown: "Unknown",
    };

    // Function to get user-friendly type display
    const getTypeDisplay = (dataType) => {
        return typeDisplayMap[dataType] || dataType || "Unknown";
    };

    // Function to check if input should use system default (from metadata, defaulting to true)
    const isUsingSystemDefault = (input) => {
        return input.metadata?.use_system_default !== false;
    };

    // Function to check if input is set to manual override
    const isSetManually = (input) => {
        return input.metadata?.set_manually === true;
    };

    // Function to determine if an input should be shown in the detailed editor
    const shouldShowInDetailedEditor = (input) => {
        // If set manually, always show
        if (isSetManually(input)) {
            return true;
        }
        
        // If using system default, don't show
        if (isUsingSystemDefault(input)) {
            return false;
        }
        
        // If source is "Get From Input", hide it
        if (input.type === "arg_mapping") {
            return false;
        }
        
        // Otherwise, show it
        return true;
    };

    // Function to check if we should show red border (required = true AND ready = false)
    const shouldShowRedBorder = (input) => {
        const isRequired = input.metadata?.required === true;
        const isNotReady = input.ready === false;
        return isRequired && isNotReady;
    };

    const handleTypeChange = (argName, newType) => {
        dispatch(
            workflowNodesActions.updateNodeInputByArgName({
                nodeId,
                argName,
                updates: { type: newType },
            })
        );
    };

    const handleReadyChange = (argName, newReady) => {
        dispatch(
            workflowNodesActions.updateNodeInputByArgName({
                nodeId,
                argName,
                updates: { ready: newReady === "true" },
            })
        );
    };

    const handleSystemDefaultToggle = (argName, useSystemDefault) => {
        dispatch(
            workflowNodesActions.updateNodeInputByArgName({
                nodeId,
                argName,
                updates: {
                    metadata: {
                        ...inputs.find((i) => i.arg_name === argName)?.metadata,
                        use_system_default: useSystemDefault,
                    },
                },
            })
        );
    };

    const handleSourceChange = (argName, newSource) => {
        dispatch(
            workflowNodesActions.updateNodeInputByArgName({
                nodeId,
                argName,
                updates: { type: newSource },
            })
        );
    };

    const handleSetManuallyToggle = (argName, setManually) => {
        dispatch(
            workflowNodesActions.updateNodeInputByArgName({
                nodeId,
                argName,
                updates: {
                    metadata: {
                        ...inputs.find((i) => i.arg_name === argName)?.metadata,
                        set_manually: setManually,
                    },
                },
            })
        );
    };

    const handleDefaultValueChange = (argName, newValue) => {
        dispatch(
            workflowNodesActions.updateNodeInputByArgName({
                nodeId,
                argName,
                updates: { default_value: newValue },
            })
        );
    };

    const handleMappingValueChange = (argName, newValue) => {
        dispatch(
            workflowNodesActions.updateNodeInputByArgName({
                nodeId,
                argName,
                updates: { default_value: newValue },
            })
        );
    };

    const handleResetToDefaults = () => {
        if (!registeredFunction) {
            console.warn("No registered function data available for reset");
            return;
        }

        // ================================================================= REPLACE WITH SOMETHING THAT GETS IT FROM THE NODE DEFINITION =========================
        const defaultInputs = generateNodeInputs(registeredFunction);
        
        // Preserve any existing inputs that have allow_reset: false
        const preservedInputs = inputs?.filter(input => input.metadata?.allow_reset === false) || [];
        
        // Combine default inputs with preserved inputs
        const finalInputs = [...defaultInputs, ...preservedInputs];
        
        // Update all inputs at once
        dispatch(
            workflowNodesActions.updateInputs({
                id: nodeId,
                inputs: finalInputs,
            })
        );
    };

    const renderValueInput = (input) => {
        const isArgMapping = input.type === "arg_mapping";
        const isBroker = input.type === "broker";

        // For arg_mapping and broker, render a single line input for ID
        if (isArgMapping || isBroker) {
            return (
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{isArgMapping ? "Mapping ID" : "Broker ID"}</label>
                    <Input
                        value={input.default_value || ""}
                        onChange={(e) => handleMappingValueChange(input.arg_name, e.target.value)}
                        placeholder={`Enter ${isArgMapping ? "mapping" : "broker"} ID`}
                        className="w-full text-sm font-mono"
                    />
                </div>
            );
        }

        // For other types, use our new DataTypeInput component
        return (
            <DataTypeInput
                value={input.default_value}
                onChange={(newValue) => handleDefaultValueChange(input.arg_name, newValue)}
                dataType={input.metadata?.data_type || "unknown"}
                placeholder="null"
            />
        );
    };

    if (!inputs || inputs.length === 0) {
        return <div className="text-sm text-muted-foreground p-4">No inputs configured for this node.</div>;
    }

    // Filter out hidden inputs for display
    const visibleInputs = inputs.filter((input) => !hiddenArgNames.includes(input.arg_name));

    return (
        <div className="h-full overflow-auto pr-2 space-y-6">
            {/* Input Configuration Table */}
            <SectionContainer title="Input Configuration">
                <div className="p-4 space-y-4">
                    {/* Header with reset button */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Configure input sources and defaults</span>
                        <Button
                            onClick={handleResetToDefaults}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                            disabled={!registeredFunction}
                        >
                            <RotateCcw className="h-4 w-4" />
                            Reset to Defaults
                        </Button>
                    </div>

                    {/* Clean table-like configuration section */}
                    <div className="space-y-3 border rounded-lg p-3">                
                        {/* Table headers */}
                        <div className="grid grid-cols-5 gap-4 px-3 py-2 text-sm text-muted-foreground font-medium border-b">
                            <div>Input Name</div>
                            <div className="text-center">Use System Default</div>
                            <div className="text-center">Source</div>
                            <div className="text-center">Manual (Admin)</div>
                            <div></div> {/* Spacer */}
                        </div>
                        
                        {/* Table rows */}
                        <div className="space-y-1">
                            {visibleInputs.map((input) => {
                                const useSystemDefault = isUsingSystemDefault(input);
                                const setManually = isSetManually(input);
                                
                                return (
                                    <div key={input.arg_name} className="grid grid-cols-5 gap-4 px-3 py-2 items-center hover:bg-muted/50 rounded border-b last:border-none min-h-[40px]">
                                        {/* Input Name */}
                                        <div className="text-sm flex items-center">{toTitleCase(input.arg_name)}</div>
                                        
                                        {/* Use System Default */}
                                        <div className="flex justify-center items-center">
                                            <Switch
                                                checked={useSystemDefault}
                                                onCheckedChange={(checked) => handleSystemDefaultToggle(input.arg_name, checked)}
                                                className="scale-75"
                                            />
                                        </div>
                                        
                                        {/* Source */}
                                        <div className="flex justify-center items-center h-full">
                                            <Select
                                                value={input.type}
                                                onValueChange={(value) => handleSourceChange(input.arg_name, value)}
                                                disabled={useSystemDefault}
                                            >
                                                <SelectTrigger className={`h-7 w-full text-xs bg-transparent border border-gray-300 dark:border-gray-700 ${useSystemDefault ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    <SelectValue placeholder="Select source..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {typeOptions.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        {/* Set Manually */}
                                        <div className="flex justify-center items-center">
                                            <Switch
                                                checked={setManually}
                                                onCheckedChange={(checked) => handleSetManuallyToggle(input.arg_name, checked)}
                                                className="scale-75"
                                            />
                                        </div>
                                        
                                        {/* Spacer */}
                                        <div></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </SectionContainer>

            {/* Detailed Input Editors */}
            <SectionContainer title="Detailed Input Configuration">
                <div className="p-4 space-y-4">
                    {visibleInputs
                        .filter((input) => shouldShowInDetailedEditor(input))
                        .map((input) => {
                            const showRedBorder = shouldShowRedBorder(input);
                            
                            return (
                                <div 
                                    key={input.arg_name} 
                                    className={`border rounded-lg p-3 space-y-3 bg-card ${
                                        showRedBorder ? 'border-red-500 border-2' : ''
                                    }`}
                                >
                                    {/* Single row with arg name, badges, and controls */}
                                    <div className="flex items-center gap-3">
                                        {/* Left side: arg name and badges */}
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="font-medium text-sm truncate">{toTitleCase(input.arg_name)}</span>
                                            <Badge
                                                variant={input.metadata?.required ? "destructive" : "secondary"}
                                                className="text-xs whitespace-nowrap"
                                            >
                                                {input.metadata?.required ? "Required" : "Optional"}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                                                {getTypeDisplay(input.metadata?.data_type)}
                                            </Badge>
                                        </div>
                                        {/* Right side: controls */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {/* Type selector */}
                                            <Select
                                                value={input.type}
                                                onValueChange={(value) => handleTypeChange(input.arg_name, value)}
                                            >
                                                <SelectTrigger className="h-8 min-w-64 bg-transparent border border-gray-300 dark:border-gray-700">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {typeOptions.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {/* Ready selector */}
                                            <Select
                                                value={input.ready?.toString()}
                                                onValueChange={(value) => handleReadyChange(input.arg_name, value)}
                                            >
                                                <SelectTrigger className="h-8 min-w-32 bg-transparent border border-gray-300 dark:border-gray-700">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="true">Ready</SelectItem>
                                                    <SelectItem value="false">Not Ready</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {/* Dynamic value input based on type */}
                                    {renderValueInput(input)}
                                </div>
                            );
                        })}
                </div>
            </SectionContainer>
        </div>
    );
};

export default InputEditor;