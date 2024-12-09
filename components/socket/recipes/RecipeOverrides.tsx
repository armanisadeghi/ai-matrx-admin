// File Location: components/socket/recipes/RecipeOverrides.tsx
'use client';

import {
    Input,
    Label,
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from '@/components/ui';
import {ChevronDown} from "lucide-react";
import {ArmaniCollapsible} from "@/components/matrx/matrx-collapsible";

interface OverridesProps {
    model_override: string;
    processor_overrides: string;
    other_overrides: string;
}

interface RecipeOverridesProps {
    taskIndex: number;
    overrides: OverridesProps;
    updateTaskData: (taskIndex: number, field: string, value: any) => void;
}

export function RecipeOverrides(
    {
        taskIndex,
        overrides,
        updateTaskData
    }: RecipeOverridesProps) {
    return (
        <ArmaniCollapsible title="Overrides">
            <div className="space-y-3 p-4">
                <div>
                    <Label>Model Override</Label>
                    <Input
                        value={overrides.model_override}
                        onChange={(e) => updateTaskData(taskIndex, 'overrides', {
                            ...overrides,
                            model_override: e.target.value
                        })}
                        className="mt-1"
                    />
                </div>
                <div>
                    <Label>Processor Overrides (JSON)</Label>
                    <Input
                        value={overrides.processor_overrides}
                        onChange={(e) => updateTaskData(taskIndex, 'overrides', {
                            ...overrides,
                            processor_overrides: e.target.value
                        })}
                        className="mt-1"
                    />
                </div>
                <div>
                    <Label>Other Overrides (JSON)</Label>
                    <Input
                        value={overrides.other_overrides}
                        onChange={(e) => updateTaskData(taskIndex, 'overrides', {
                            ...overrides,
                            other_overrides: e.target.value
                        })}
                        className="mt-1"
                    />
                </div>
            </div>
        </ArmaniCollapsible>
    );
}
