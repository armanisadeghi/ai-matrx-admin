import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { withBrokerInput } from "../wrappers/withMockBrokerInput";
import { cn } from "@/lib/utils";

export const BrokerCheckbox = withBrokerInput(({ 
    value, 
    onChange, 
    inputComponent 
}) => {
    const options = inputComponent.options ?? [];
    const allOptions = inputComponent.includeOther ? [...options, { label: 'Other', value: '_other' }] : options;
    const orientation = inputComponent.orientation === 'horizontal' ? 'horizontal' : 'vertical';

    // Convert incoming value to array
    const currentValues = Array.isArray(value) ? value : value ? [value] : [];

    // Find custom value (any value not in options and not '_other')
    const otherValue = currentValues.find(v => 
        v !== '_other' && !options.some(opt => opt.value === v)
    );
    const showOtherInput = Boolean(currentValues.includes('_other'));

    const handleCheckboxChange = (checked: boolean, optionValue: string) => {
        let newValues: string[];

        if (optionValue === '_other') {
            if (checked) {
                // Add _other to the list, but don't add any custom value yet
                newValues = [...currentValues.filter(v => options.some(opt => opt.value === v)), '_other'];
            } else {
                // Remove both _other and any custom value
                newValues = currentValues.filter(v => options.some(opt => opt.value === v));
            }
        } else {
            if (checked) {
                // Add the new value while preserving other values including custom
                newValues = [...currentValues, optionValue];
            } else {
                // Remove just this value
                newValues = currentValues.filter(v => v !== optionValue);
            }
        }

        onChange(newValues);
    };

    const handleOtherInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newOtherValue = e.target.value;
        
        // Remove any existing custom value but keep '_other' marker
        const standardValues = currentValues.filter(v => 
            options.some(opt => opt.value === v) || v === '_other'
        );

        if (newOtherValue) {
            onChange([...standardValues, newOtherValue]);
        } else {
            onChange(standardValues);
        }
    };

    return (
        <div className="space-y-4">
            <div className={cn(
                orientation === 'horizontal' 
                    ? "flex flex-row flex-wrap gap-4" 
                    : "flex flex-col space-y-2"
            )}>
                {allOptions.map((option) => (
                    <div 
                        key={option.value} 
                        className={cn(
                            "flex items-center space-x-2",
                            orientation === 'horizontal' && "min-w-fit"
                        )}
                    >
                        <Checkbox
                            id={option.value}
                            checked={currentValues.includes(option.value)}
                            onCheckedChange={(checked) => 
                                handleCheckboxChange(checked as boolean, option.value)
                            }
                        />
                        <label
                            htmlFor={option.value}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            {option.label}
                        </label>
                    </div>
                ))}
            </div>
            
            {showOtherInput && (
                <Input
                    value={otherValue || ''}
                    onChange={handleOtherInputChange}
                    placeholder="Enter custom value..."
                    className="mt-2"
                />
            )}
        </div>
    );
});