import { useState, useRef } from "react";
import { Label, Input } from "@/components/ui";
import { cn } from "@/utils";
import { withBrokerInput, withBrokerCustomInput } from "../wrappers/withBrokerInput";

export const BrokerInput = withBrokerInput(({ 
    value, 
    onChange, 
    inputComponent 
}) => {
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        
        if (!newValue || !inputComponent.additionalParams?.validation) {
            setError(null);
        } else if (inputComponent.additionalParams?.validation) {
            const { pattern, message } = inputComponent.additionalParams.validation;
            if (pattern && !new RegExp(pattern).test(newValue)) {
                setError(message || 'Invalid input');
            } else {
                setError(null);
            }
        }
        
        onChange(newValue);
    };

    const handleFocus = () => {
        if (inputRef.current) {
            inputRef.current.select();
        }
    };

    return (
        <div className="w-full space-y-1">
            <Input
                ref={inputRef}
                value={value ?? ''}
                onChange={handleChange}
                onFocus={handleFocus}
                type={inputComponent.additionalParams?.type || 'text'}
                placeholder={inputComponent.placeholder}
                className={cn(error && "border-destructive")}
            />
            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}
        </div>
    );
});

export const BrokerCustomInput = withBrokerCustomInput(({ 
    value, 
    onChange, 
    inputComponent 
}) => {
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        
        // Clear error if field is empty or passes validation
        if (!newValue || !inputComponent.additionalParams?.validation) {
            setError(null);
        } else if (inputComponent.additionalParams?.validation) {
            const { pattern, message } = inputComponent.additionalParams.validation;
            if (pattern && !new RegExp(pattern).test(newValue)) {
                setError(message || 'Invalid input');
            } else {
                setError(null);
            }
        }
        
        onChange(newValue);
    };

    const handleFocus = () => {
        if (inputRef.current) {
            inputRef.current.select();
        }
    };

    return (
        <div className="space-y-1">
            <Label>{inputComponent.name}</Label>
            <Input
                ref={inputRef}
                value={value}
                onChange={handleChange}
                onFocus={handleFocus}
                type={inputComponent.additionalParams?.type || 'text'}
                placeholder={inputComponent.additionalParams?.placeholder}
                className={cn(
                    error && "border-red-500",
                    inputComponent.componentClassName
                )}
            />
            {error && (
                <p className="text-sm text-red-500">{error}</p>
            )}
            {inputComponent.description && (
                <p className="text-sm text-muted-foreground">
                    {inputComponent.description}
                </p>
            )}
        </div>
    );
});