import { useState, useRef } from "react";
import { Input } from "@/components/ui";
import { cn } from "@/utils";
import { withBrokerComponentWrapper } from "../wrappers/withBrokerComponentWrapper";

export const BrokerInput = withBrokerComponentWrapper(({ 
    value, 
    onChange, 
    inputComponent,
    isDemo,
    ...rest
}) => {
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const className = inputComponent.componentClassName;

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
        <div className={cn('w-full space-y-1', className)}>
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

export default BrokerInput;
