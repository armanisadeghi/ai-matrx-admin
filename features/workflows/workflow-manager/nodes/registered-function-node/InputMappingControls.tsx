"use client";

import { useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { createWorkflowSelectors } from "@/lib/redux/entity/custom-selectors/workflowSelectors";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { convertPythonTypeToDisplay } from "@/utils/python-type-converter";
import QuickRefSelect from "@/app/entities/quick-reference/QuickRefSelectFloatingLabel";

interface InputMappingControlsProps {
    selectedFunction: any;
    argMappings: Record<string, string>;
    onAddMapping: (argName: string, brokerId: string) => void;
}

export default function InputMappingControls({
    selectedFunction,
    argMappings,
    onAddMapping,
}: InputMappingControlsProps) {
    const [newMappingArg, setNewMappingArg] = useState<string>("");
    const [newMappingBroker, setNewMappingBroker] = useState<string>("");
    const [useExistingBroker, setUseExistingBroker] = useState<boolean>(true);
    const [selectedRecordKey, setSelectedRecordKey] = useState<string>("");
    const [validationError, setValidationError] = useState<string>("");

    const workflowSelectors = createWorkflowSelectors();
    const availableDataBrokers = useAppSelector(workflowSelectors.availableDataBrokers);

    // Validate and normalize broker ID
    const validateAndNormalizeBrokerId = (brokerId: string): { isValid: boolean; normalizedId: string; error: string } => {
        if (!brokerId.trim()) {
            return { isValid: false, normalizedId: "", error: "Broker ID cannot be empty" };
        }

        // Convert spaces to underscores and trim
        const normalized = brokerId.trim().replace(/\s+/g, '_');
        
        // Check if it matches valid patterns:
        // - UUIDs: 123e4567-e89b-12d3-a456-426614174000
        // - kebab-case: my-broker-id
        // - snake_case: my_broker_id
        // - camelCase: myBrokerId
        // - PascalCase: MyBrokerId
        // - Pure alphanumeric strings
        const validPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
        
        if (!validPattern.test(normalized)) {
            return { 
                isValid: false, 
                normalizedId: normalized, 
                error: "Broker ID must contain only letters, numbers, hyphens, and underscores" 
            };
        }

        return { isValid: true, normalizedId: normalized, error: "" };
    };

    const handleAddMapping = () => {
        // Clear previous validation error
        setValidationError("");

        // Check if input is selected
        if (!newMappingArg.trim()) {
            setValidationError("Please select an input to map");
            return;
        }

        // For existing brokers, the QuickRefSelect handles validation
        if (useExistingBroker) {
            if (!newMappingBroker) {
                setValidationError("Please select a data broker");
                return;
            }
            onAddMapping(newMappingArg, newMappingBroker);
            setNewMappingArg("");
            setNewMappingBroker("");
            setSelectedRecordKey("");
            return;
        }

        // For consumable brokers, validate the ID
        const validation = validateAndNormalizeBrokerId(newMappingBroker);
        
        if (!validation.isValid) {
            setValidationError(validation.error);
            return;
        }

        // Use the normalized ID
        onAddMapping(newMappingArg, validation.normalizedId);
        setNewMappingArg("");
        setNewMappingBroker("");
        setSelectedRecordKey("");
    };

    // Get unmapped arguments
    const unmappedArgs = selectedFunction.args?.filter((arg: any) => !argMappings[arg.name]) || [];

    // Handle broker selection from QuickRefSelect
    const handleBrokerSelect = (recordId: string) => {
        // Extract broker ID from recordId format "id:some-uuid-value"
        const brokerId = recordId.startsWith('id:') ? recordId.substring(3) : recordId;
        setNewMappingBroker(brokerId);
        setSelectedRecordKey(recordId);
        setValidationError(""); // Clear any previous errors
    };

    // Handle manual broker ID input change
    const handleBrokerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMappingBroker(e.target.value);
        setValidationError(""); // Clear validation error on input change
    };

    if (unmappedArgs.length === 0) {
        return (
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-2">
                    Input Mapping
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                    All inputs have been mapped to brokers.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                    Add Input Mapping
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-2">
                    Map inputs to broker IDs to have the value of that broker directly used. Or create a 'consumable' broker that is made and used only within your workflow.
                </p>
            </div>
            
            <div className="space-y-4">
                {/* Validation Error Display */}
                {validationError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                        <p className="text-sm text-red-700 dark:text-red-300">{validationError}</p>
                    </div>
                )}

                {/* Argument Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-orange-800 dark:text-orange-200">
                        Select Input
                    </label>
                    <Select value={newMappingArg || undefined} onValueChange={setNewMappingArg}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose input to map" />
                        </SelectTrigger>
                        <SelectContent>
                            {unmappedArgs.map((arg: any) => (
                                <SelectItem key={arg.name} value={arg.name}>
                                    {arg.name} ({convertPythonTypeToDisplay(arg.dataType)})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Broker Selection Mode */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-orange-800 dark:text-orange-200">
                        Broker Source
                    </label>
                    <div className="flex items-center gap-3">
                        <Switch
                            checked={useExistingBroker}
                            onCheckedChange={setUseExistingBroker}
                        />
                        <span className="text-sm text-orange-700 dark:text-orange-300">
                            {useExistingBroker ? "Use existing broker" : "Create consumable ID"}
                        </span>
                    </div>
                </div>

                {/* Broker Input */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-orange-800 dark:text-orange-200">
                        {useExistingBroker ? 'Data Broker' : 'Consumable Broker ID'}
                    </label>
                    {useExistingBroker ? (
                        <QuickRefSelect
                            entityKey="dataBroker"
                            fetchMode="native"
                            onSelect={handleBrokerSelect}
                            customSelectText="Choose data broker"
                            initialSelectedRecordKey={selectedRecordKey}
                        />
                    ) : (
                        <Input
                            type="text"
                            value={newMappingBroker}
                            onChange={handleBrokerInputChange}
                            placeholder="Enter consumable broker ID (e.g., 'user_input_result', 'processed_data')..."
                            className="w-full"
                        />
                    )}
                    {!useExistingBroker && (
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                            Accepts: UUIDs, kebab-case, snake_case. Spaces will be converted to underscores.
                        </p>
                    )}
                </div>

                {/* Add Button */}
                <div className="flex justify-end">
                    <Button
                        onClick={handleAddMapping}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                        Add Mapping
                    </Button>
                </div>
            </div>
        </div>
    );
} 