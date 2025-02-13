import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { withBrokerComponentWrapper } from "../wrappers/withBrokerComponentWrapper";
import { useOtherOption } from './hooks/useOtherOption';

export const BrokerCheckbox = withBrokerComponentWrapper(({ 
    value, 
    onChange, 
    inputComponent,
    isDemo,
    ...rest
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
        value: Array.isArray(value) ? value : value ? [value] : [],
        options: inputComponent.options ?? [],
        includeOther: inputComponent.includeOther,
        onChange
    });

    const selectedValues = Array.isArray(selected) ? selected : [];

    const handleCheckboxChange = (checked: boolean, option: string) => {
        if (checked) {
            handleChange([...selectedValues, option]);
        } else {
            handleChange(selectedValues.filter(v => v !== option));
        }
    };

    const orientation = inputComponent.orientation === "horizontal" ? "horizontal" : "vertical";

    return (
        <div className={cn('space-y-2', inputComponent.componentClassName)}>
            <div className={cn(
                orientation === "horizontal" 
                    ? "flex flex-row flex-wrap gap-4" 
                    : "flex flex-col space-y-2"
            )}>
                {internalOptions.map((option) => (
                    <div 
                        key={option} 
                        className={cn(
                            "flex items-center space-x-2",
                            orientation === "horizontal" && "min-w-fit"
                        )}
                    >
                        <Checkbox
                            id={option}
                            checked={selectedValues.includes(option)}
                            onCheckedChange={(checked) => 
                                handleCheckboxChange(checked as boolean, option)
                            }
                        />
                        <label
                            htmlFor={option}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            {getDisplayValue(option)}
                        </label>
                    </div>
                ))}
            </div>

            {showOtherInput && (
                <Input 
                    value={otherValue}
                    onChange={(e) => handleOtherInputChange(e.target.value)}
                    placeholder="Enter other values separated by commas."
                    className="mt-2"
                />
            )}
        </div>
    );
});

export default BrokerCheckbox;