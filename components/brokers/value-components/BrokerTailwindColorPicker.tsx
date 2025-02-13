import { TAILWIND_COLORS, generateColorStyle, TailwindColor } from '@/constants/rich-text-constants';
import { withBrokerComponentWrapper } from "../wrappers/withBrokerComponentWrapper";

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export const BrokerTailwindColorPicker = withBrokerComponentWrapper(({ 
    value, 
    onChange, 
    inputComponent,
    isDemo,
    ...rest
}) => {
    const currentColor = (value as TailwindColor) || TAILWIND_COLORS[0];
    const className = inputComponent.componentClassName;
    return (
        <div className={cn('w-full', className)}>
            <div className="flex flex-wrap gap-1.5">
                {TAILWIND_COLORS.map((color) => (
                    <button
                        key={color}
                        onClick={() => onChange(color)}
                        className={cn(
                            'w-7 h-7 rounded flex items-center justify-center',
                            'ring-offset-background',
                            generateColorStyle(color),
                            currentColor === color ? 'ring-2 ring-ring ring-offset-2' : 'ring-1 ring-ring/20'
                        )}
                        type="button"
                        aria-label={`Select ${color}`}
                    >
                        {currentColor === color && (
                            <Check className="w-3 h-3" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
});

export default BrokerTailwindColorPicker;
