import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { withBrokerInput } from "../components/withBrokerInput";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export const BrokerRadioGroup = withBrokerInput(({ 
    value, 
    onChange, 
    inputComponent 
}) => {
    const options = inputComponent.options ?? [];
    const allOptions = inputComponent.includeOther ? [...options, { label: 'Other', value: '_other' }] : options;

    const orientation = inputComponent.orientation === 'horizontal' ? 'horizontal' : 'vertical';
    
    const [showOtherInput, setShowOtherInput] = useState(false);
    const [otherValue, setOtherValue] = useState('');
    const [displayValue, setDisplayValue] = useState(() => {
        const isValueInOptions = options.some((option) => option.value === value);
        return !isValueInOptions && value ? '_other' : value;
    });

    useEffect(() => {
        const isValueInOptions = options.some((option) => option.value === value);
        if (!isValueInOptions && value) {
            setShowOtherInput(true);
            setOtherValue(value);
            setDisplayValue('_other');
        } else if (isValueInOptions) {
            setDisplayValue(value);
            setShowOtherInput(false);
        }
    }, [value, options]);

    const handleChange = (newValue: string) => {
        if (newValue === '_other') {
            setShowOtherInput(true);
            setDisplayValue('_other');
            onChange(otherValue);
        } else {
            setShowOtherInput(false);
            setDisplayValue(newValue);
            onChange(newValue);
        }
    };

    const handleOtherInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setOtherValue(newValue);
        onChange(newValue);
    };

    return (
        <div className="space-y-4">
            <RadioGroup
                value={displayValue || ''}
                onValueChange={handleChange}
                className={cn(
                    orientation === 'horizontal' 
                        ? "flex flex-row flex-wrap gap-4" 
                        : "flex flex-col space-y-2"
                )}
            >
                {allOptions.map((option) => (
                    <div 
                        key={option.value} 
                        className={cn(
                            "flex items-center space-x-2",
                            orientation === 'horizontal' && "min-w-fit"
                        )}
                    >
                        <RadioGroupItem value={option.value} id={option.value} />
                        <Label htmlFor={option.value}>{option.label}</Label>
                    </div>
                ))}
            </RadioGroup>

            {showOtherInput && (
                <Input
                    value={otherValue}
                    onChange={handleOtherInputChange}
                    placeholder="Enter custom value..."
                    className="mt-2"
                />
            )}
        </div>
    );
});