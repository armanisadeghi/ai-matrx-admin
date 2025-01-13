import LightSwitchToggle from '@/components/matrx/LightSwitchToggle';
import React from 'react';

interface EntitySpecialSwitchProps {
    value: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
    className?: string;
    dynamicFieldInfo: any;
    ref?: React.Ref<any>;
}

const EntitySpecialSwitch = React.forwardRef<HTMLElement, EntitySpecialSwitchProps>(
    ({ value, onChange, disabled, className, dynamicFieldInfo }, ref) => {
        // Safely extract componentProps or use empty object as fallback
        const componentProps = dynamicFieldInfo?.componentProps || {};

        // Extract configuration with fallbacks
        const variant = componentProps?.variant || "geometric";
        const width = componentProps?.width || "w-28";
        const height = componentProps?.height || "h-7";
        
        // Handle labels with type safety and fallbacks
        const defaultLabels = { on: "True", off: "False" };
        const labels = (() => {
            if (!componentProps?.labels) return defaultLabels;
            
            const userLabels = componentProps.labels;
            if (typeof userLabels !== 'object') return defaultLabels;
            
            return {
                on: userLabels.on || defaultLabels.on,
                off: userLabels.off || defaultLabels.off
            };
        })();

        // Use the value directly, falling back to defaultValue only if value is undefined
        const effectiveValue = value ?? dynamicFieldInfo?.defaultValue ?? false;

        return (
            <div className="w-full flex flex-wrap items-center justify-between space-y-2">
                <span className="text-sm flex items-center">
                    {dynamicFieldInfo.displayName}
                </span>
                <LightSwitchToggle
                    ref={ref}
                    variant={variant}
                    width={width}
                    height={height}
                    disabled={disabled}
                    value={effectiveValue}
                    onChange={onChange}
                    labels={labels}
                    className={className}
                />
            </div>
        );
    }
);

EntitySpecialSwitch.displayName = 'EntitySpecialSwitch';

export default React.memo(EntitySpecialSwitch);