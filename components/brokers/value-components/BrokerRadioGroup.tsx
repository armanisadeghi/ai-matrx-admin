import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { withBrokerComponentWrapper } from "../wrappers/withBrokerComponentWrapper";
import { cn } from "@/lib/utils";
import { useOtherOption } from "./hooks/useOtherOption";

export const BrokerRadioGroup = withBrokerComponentWrapper(({ value, onChange, inputComponent, isDemo, ...rest }) => {
    const { showOtherInput, otherValue, selected, internalOptions, handleChange, handleOtherInputChange, getDisplayValue } = useOtherOption(
        {
            value,
            options: inputComponent.options ?? [],
            includeOther: inputComponent.includeOther,
            onChange,
        }
    );

    const orientation = inputComponent.orientation === "horizontal" ? "horizontal" : "vertical";

    return (
        <div className="w-full h-full px-2 pt-2 items-center justify-center">
            <div className={cn("space-y-2", inputComponent.componentClassName)}>
                <RadioGroup
                    value={selected as string}
                    onValueChange={handleChange}
                    className={cn(orientation === "horizontal" ? "flex flex-row flex-wrap gap-4" : "flex flex-col space-y-2")}
                >
                    {internalOptions.map((option) => (
                        <div key={option} className={cn("flex items-center space-x-2", orientation === "horizontal" && "min-w-fit")}>
                            <RadioGroupItem value={option} id={option} />
                            <Label htmlFor={option}>{getDisplayValue(option)}</Label>
                        </div>
                    ))}
                </RadioGroup>

                {showOtherInput && (
                    <Input
                        value={otherValue}
                        onChange={(e) => handleOtherInputChange(e.target.value)}
                        placeholder="Enter custom value..."
                        className="mt-2"
                    />
                )}
            </div>
        </div>
    );
});

export default BrokerRadioGroup;
