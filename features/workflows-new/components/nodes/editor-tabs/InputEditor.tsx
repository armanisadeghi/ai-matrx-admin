import React from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { workflowNodeActions } from "@/lib/redux/workflow-node";
import { workflowNodeSelectors } from "@/lib/redux/workflow-node/selectors";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ALL_HIDDEN_CONNECTIONS } from "@/features/workflows-new/utils/node-utils";
import DataTypeInput from "./common/DataTypeInput";
import { DefaultTabProps } from "./types";

const toTitleCase = (str: string): string => {
    return (
        str
            // Handle snake_case: replace underscores with spaces
            .replace(/_/g, " ")
            // Handle camelCase: insert space before uppercase letters
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            // Capitalize first letter of each word
            .replace(/\b\w/g, (letter) => letter.toUpperCase())
            .trim()
    );
};

const InputEditor: React.FC<DefaultTabProps> = ({ nodeId }) => {
    const inputs = useAppSelector((state) => workflowNodeSelectors.nodeInputs(state, nodeId));
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

    // Function to check if we should show red border (required = true AND ready = false)
    const shouldShowRedBorder = (input) => {
        const isRequired = input.metadata?.required === true;
        const isNotReady = input.ready === false;
        return isRequired && isNotReady;
    };

    const handleTypeChange = (argName, newType) => {
        dispatch(
            workflowNodeActions.updateNodeInputByArgName({
                nodeId,
                argName,
                updates: { type: newType },
            })
        );
    };

    const handleReadyChange = (argName, newReady) => {
        dispatch(
            workflowNodeActions.updateNodeInputByArgName({
                nodeId,
                argName,
                updates: { ready: newReady === "true" },
            })
        );
    };

    const handleSystemDefaultToggle = (argName, useSystemDefault) => {
        dispatch(
            workflowNodeActions.updateNodeInputByArgName({
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

    const handleDefaultValueChange = (argName, newValue) => {
        dispatch(
            workflowNodeActions.updateNodeInputByArgName({
                nodeId,
                argName,
                updates: { default_value: newValue },
            })
        );
    };

    const handleMappingValueChange = (argName, newValue) => {
        dispatch(
            workflowNodeActions.updateNodeInputByArgName({
                nodeId,
                argName,
                updates: { default_value: newValue },
            })
        );
    };

    const renderValueInput = (input) => {
        const useSystemDefault = isUsingSystemDefault(input);
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
                        disabled={useSystemDefault}
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
                disabled={useSystemDefault}
            />
        );
    };

    if (!inputs || inputs.length === 0) {
        return <div className="text-sm text-muted-foreground p-4">No inputs configured for this node.</div>;
    }

    return (
        <div className="space-y-4 p-4">
            {inputs
                .filter((input) => !hiddenArgNames.includes(input.arg_name))
                .map((input) => {
                    const useSystemDefault = isUsingSystemDefault(input);
                    const showRedBorder = shouldShowRedBorder(input);
                    
                    return (
                        <div 
                            key={input.arg_name} 
                            className={`border rounded-lg p-3 space-y-3 bg-card ${
                                showRedBorder ? 'border-red-500 border-2' : ''
                            }`}
                        >
                            {/* Single row with arg name, badges, switch, and controls */}
                            <div className="flex items-center gap-3">
                                {/* Left side: arg name, badges, and switch */}
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="font-medium text-sm truncate">{toTitleCase(input.arg_name)}</span>
                                    {/* System Default Toggle - moved here */}
                                    <div className="flex items-center gap-1">
                                        <Switch
                                            id={`system-default-${input.arg_name}`}
                                            checked={useSystemDefault}
                                            onCheckedChange={(checked) => handleSystemDefaultToggle(input.arg_name, checked)}
                                            className="scale-75"
                                        />
                                        <Label htmlFor={`system-default-${input.arg_name}`} className="text-xs text-muted-foreground">
                                            Use System Default
                                        </Label>
                                    </div>
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
                                        disabled={useSystemDefault}
                                    >
                                        <SelectTrigger className="h-8 w-full">
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
                                        disabled={useSystemDefault}
                                    >
                                        <SelectTrigger className="h-8 w-full">
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
    );
};

export default InputEditor;