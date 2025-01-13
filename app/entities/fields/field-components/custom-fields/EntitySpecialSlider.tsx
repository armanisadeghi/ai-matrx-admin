import React from 'react';
import { Slider } from '@/components/ui/slider';

interface EntitySpecialSliderProps {
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
    className?: string;
    dynamicFieldInfo: any;
    ref?: React.Ref<any>;
}

const EntitySpecialSlider = React.forwardRef<HTMLElement, EntitySpecialSliderProps>(
    ({ value, onChange, disabled, className, dynamicFieldInfo }, ref) => {
        const componentProps = dynamicFieldInfo?.componentProps || {};

        // Extract configuration with fallbacks
        const max = (() => {
            const maxValue = componentProps?.max;
            return typeof maxValue === 'number' ? maxValue : 1;
        })();

        const min = (() => {
            const minValue = componentProps?.min;
            return typeof minValue === 'number' ? minValue : 0;
        })();

        const step = (() => {
            const stepValue = componentProps?.step;
            return typeof stepValue === 'number' ? stepValue : 0.01;
        })();

        // Ensure value is within bounds and handle array conversion
        const safeValue = Math.max(min, Math.min(max, value ?? dynamicFieldInfo?.defaultValue ?? min));

        // Handle the onChange to match the expected format
        const handleChange = (newValue: number[]) => {
            onChange(newValue[0]);
        };

        // Format the display value based on step size
        const formattedValue = (() => {
            if (step >= 1) {
                return safeValue.toLocaleString();
            }
            // For decimal steps, show the appropriate number of decimal places
            const decimalPlaces = Math.max(0, -Math.floor(Math.log10(step)));
            return safeValue.toFixed(decimalPlaces);
        })();

        return (
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span>{dynamicFieldInfo.displayName}</span>
                    <span className="text-muted-foreground">
                        {formattedValue}
                    </span>
                </div>
                <Slider
                    ref={ref}
                    value={[safeValue]}
                    onValueChange={handleChange}
                    min={min}
                    max={max}
                    step={step}
                    disabled={disabled}
                    className={className || 'w-full'}
                />
            </div>
        );
    }
);

EntitySpecialSlider.displayName = 'EntitySpecialSlider';

export default React.memo(EntitySpecialSlider);