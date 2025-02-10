import { withBrokerInput } from '../wrappers/withBrokerInput';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const BrokerColorPicker = withBrokerInput(({ 
    value, 
    onChange, 
    inputComponent 
}) => {
    const currentColor = value || '#6B7280';

    return (
        <div className="flex items-center gap-2 w-full">
            <Input
                type="color"
                value={currentColor}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    "h-8 w-24",
                    "border rounded",
                    "[&::-webkit-color-swatch-wrapper]:p-0",
                    "[&::-webkit-color-swatch]:border-none",
                    "[&::-webkit-color-swatch]:h-full",
                    "[&::-webkit-color-swatch]:w-full",
                    "[&::-moz-color-swatch]:border-none",
                    "[&::-moz-color-swatch]:h-full",
                    "[&::-moz-color-swatch]:w-full",
                    "p-0"
                )}
            />
            
            <Input
                type="text"
                value={currentColor.toUpperCase()}
                onChange={(e) => {
                    const newValue = e.target.value;
                    if (/^#[0-9A-F]{6}$/i.test(newValue)) {
                        onChange(newValue);
                    }
                }}
                className="h-8 w-24 text-center uppercase font-mono text-sm"
                maxLength={7}
            />
        </div>
    );
});

export default BrokerColorPicker;