import React from "react";
import { Braces } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";

interface VariableSelectorProps {
    variables: string[];
    onVariableSelected: (variable: string) => void;
    onBeforeOpen?: () => void;
    /** What a person reads for a variable (the inserted value stays `variable`). */
    labelFor?: (variable: string) => string;
    /** The trigger's accessible name. */
    ariaLabel?: string;
}

export function VariableSelector({
    variables,
    onVariableSelected,
    onBeforeOpen,
    labelFor,
    ariaLabel = "Insert a variable",
}: VariableSelectorProps) {
    const [popoverOpen, setPopoverOpen] = React.useState(false);

    return (
        <Popover 
            open={popoverOpen} 
            onOpenChange={(open) => {
                if (open) {
                    onBeforeOpen?.();
                }
                setPopoverOpen(open);
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    icon={<Braces />}
                    variant="quiet"
                    aria-label={ariaLabel}
                    title={ariaLabel}
                    onMouseDown={(e) => {
                        // Prevent textarea from losing focus
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                />
            </PopoverTrigger>
            <PopoverContent sizing="content" 
                className="sm:max-w-md p-2" 
                align="start"
            >
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {variables.length === 0 ? (
                        <div className="type-secondary text-muted-foreground px-2 py-2 italic">
                            No variables defined
                        </div>
                    ) : (
                        variables.map((variable) => (
                            <Button
                                key={variable}
                                variant="quiet"
                                className="w-full justify-start"
                                onClick={() => {
                                    onVariableSelected(variable);
                                    setPopoverOpen(false);
                                }}
                            >
                                {labelFor ? (
                                    <span className="truncate">{labelFor(variable)}</span>
                                ) : (
                                    <span className="font-mono">{variable}</span>
                                )}
                            </Button>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

