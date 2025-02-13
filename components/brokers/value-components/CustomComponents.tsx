import { useState, useRef } from "react";
import { Label, Input, Switch, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui";
import { cn } from "@/utils";
import { withBrokerComponentWrapper, withBrokerCustomInput } from "../wrappers/withBrokerComponentWrapper";
import { useOtherOption } from './hooks/useOtherOption';

export const BrokerCustomSelect = withBrokerCustomInput(({ 
    value, 
    onChange, 
    inputComponent 
}) => {
    const {
        showOtherInput,
        otherValue,
        selected,
        internalOptions,
        handleChange,
        handleOtherInputChange,
        getDisplayValue
    } = useOtherOption({
        value,
        options: inputComponent.options ?? [],
        includeOther: inputComponent.includeOther,
        onChange
    });

    return (
        <div className={cn('space-y-2', inputComponent.componentClassName)}>
            <Label>{inputComponent.name}</Label>
            <Select
                value={selected as string}
                onValueChange={handleChange}
            >
                <SelectTrigger>
                    <SelectValue>
                        {selected === '_other' ? otherValue || 'Other' : selected}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {internalOptions.map((option) => (
                        <SelectItem
                            key={option}
                            value={option}
                        >
                            {getDisplayValue(option)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            
            {showOtherInput && (
                <Input
                    value={otherValue}
                    onChange={(e) => handleOtherInputChange(e.target.value)}
                    placeholder='Enter custom value...'
                />
            )}
            
            {inputComponent.description && (
                <p className='text-sm text-muted-foreground'>
                    {inputComponent.description}
                </p>
            )}
        </div>
    );
});

export const BrokerCustomInput = withBrokerComponentWrapper(({ 
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
        <div className={cn('space-y-1', className)}>
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
                    className
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


export const BrokerCustomSwitch = withBrokerCustomInput(({ 
    value, 
    onChange, 
    inputComponent 
  }) => {
    const labelPosition = inputComponent.additionalParams?.labelPosition || 'left';
    const className = inputComponent.componentClassName;
    const switchElement = (
        <Switch
            checked={value === true || value === 'true'}
            onCheckedChange={onChange}
        />
    );
  
    return (
        <div className={cn('flex items-center justify-between gap-4', className)}>
            {labelPosition === 'left' ? (
                <>
                    <div className="flex-1">
                        <Label>{inputComponent.name}</Label>
                        {inputComponent.description && (
                            <p className="text-sm text-muted-foreground">
                                {inputComponent.description}
                            </p>
                        )}
                    </div>
                    {switchElement}
                </>
            ) : (
                <>
                    {switchElement}
                    <div className="flex-1">
                        <Label>{inputComponent.name}</Label>
                        {inputComponent.description && (
                            <p className="text-sm text-muted-foreground">
                                {inputComponent.description}
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
  });
  