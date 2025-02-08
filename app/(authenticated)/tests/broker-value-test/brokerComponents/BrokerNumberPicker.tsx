import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
import { withBrokerInput } from "../components/withBrokerInput";

export const BrokerNumberPicker = withBrokerInput(({ value, onChange, inputComponent }) => {
    const min = inputComponent.min ?? 0;
    const max = inputComponent.max ?? 100;
    const step = inputComponent.step ?? 1;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value === '' ? min : Number(e.target.value);
        if (newValue >= min && newValue <= max) {
            onChange(newValue);
        }
    };

    const increment = () => {
        const newValue = Number(value ?? min) + step;
        if (newValue <= max) {
            onChange(newValue);
        }
    };

    const decrement = () => {
        const newValue = Number(value ?? min) - step;
        if (newValue >= min) {
            onChange(newValue);
        }
    };

    return (
        <div className="flex items-center space-x-2">
            <Button
                variant="outline"
                size="icon"
                onClick={decrement}
                disabled={Number(value ?? min) <= min}
                className="h-8 w-8"
            >
                <Minus className="h-4 w-4" />
            </Button>
            <Input
                type="number"
                value={value ?? min}
                onChange={handleInputChange}
                min={min}
                max={max}
                step={step}
                className="h-8 w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button
                variant="outline"
                size="icon"
                onClick={increment}
                disabled={Number(value ?? min) >= max}
                className="h-8 w-8"
            >
                <Plus className="h-4 w-4" />
            </Button>
        </div>
    );
});