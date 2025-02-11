import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { withBrokerInput } from "../wrappers/withMockBrokerInput";

export const BrokerNumberInput = withBrokerInput(({ 
    value, 
    onChange, 
    inputComponent 
}) => {
    const min = inputComponent.min ?? 0;
    const max = inputComponent.max ?? 100;
    const step = inputComponent.step ?? 1;
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseFloat(e.target.value);
        if (isNaN(newValue)) {
            onChange(min);
        } else {
            onChange(Math.min(Math.max(newValue, min), max));
        }
    };

    const increment = () => {
        const currentValue = parseFloat(value) || min;
        const newValue = Math.min(currentValue + step, max);
        onChange(newValue);
    };

    const decrement = () => {
        const currentValue = parseFloat(value) || min;
        const newValue = Math.max(currentValue - step, min);
        onChange(newValue);
    };

    return (
        <div className="flex items-center space-x-2">
            <Button
                variant="outline"
                size="icon"
                onClick={decrement}
                disabled={value <= min}
                className="h-8 w-8"
            >
                <Minus className="h-4 w-4" />
            </Button>
            <Input
                type="number"
                value={value ?? ''}
                onChange={handleInputChange}
                min={min}
                max={max}
                step={step}
                className="w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button
                variant="outline"
                size="icon"
                onClick={increment}
                disabled={value >= max}
                className="h-8 w-8"
            >
                <Plus className="h-4 w-4" />
            </Button>
        </div>
    );
});