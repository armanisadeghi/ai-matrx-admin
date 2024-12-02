// File Location: components/socket/recipes/RecipeOverrides.tsx
import {
    Input,
    Label,
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from '@/components/ui';
import { ChevronDown } from "lucide-react";

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
        <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-t-lg p-4 text-sm font-medium hover:bg-accent/50 hover:shadow-sm">
                <span>Overrides</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 [data-state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
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
            </CollapsibleContent>
        </Collapsible>
    );
}
