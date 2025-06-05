"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import { createWorkflowSelectors } from "@/lib/redux/entity/custom-selectors/workflowSelectors";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui";
import { Button } from "@/components/ui/button";

interface FunctionSelectorOverlayProps {
    selectedFunctionId: string;
    onFunctionChange: (functionId: string) => void;
    onReset: () => void;
}

export default function FunctionSelectorOverlay({ selectedFunctionId, onFunctionChange, onReset }: FunctionSelectorOverlayProps) {
    const workflowSelectors = createWorkflowSelectors();
    const registeredFunctionOptions = useAppSelector(workflowSelectors.registeredFunctionOptions);

    return (
        <div className="bg-inherit rounded-lg p-4 space-y-4">
            <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Select Function
                </h4>
            </div>
            
            <div className="flex gap-4">
                <div className="flex-1">
                    <Select value={selectedFunctionId} onValueChange={onFunctionChange}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose a registered function..." />
                        </SelectTrigger>
                        <SelectContent>
                            {registeredFunctionOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                    {option.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button
                    onClick={onReset}
                    variant="outline"
                    className="shrink-0"
                >
                    Clear
                </Button>
            </div>
        </div>
    );
} 