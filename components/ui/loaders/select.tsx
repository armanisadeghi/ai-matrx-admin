'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, Loader2, X, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type ButtonVariant = 'default' | 'destructive' | 'success' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary';
type ComponentSize = 'default' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'icon' | 'roundIcon';

const sizeToHeightMap: Record<ComponentSize, string> = {
    'xs': 'h-7',
    'sm': 'h-8',
    'default': 'h-9',
    'md': 'h-10',
    'lg': 'h-11',
    'xl': 'h-12',
    '2xl': 'h-14',
    '3xl': 'h-16',
    'icon': 'h-8 w-8',
    'roundIcon': 'h-8 w-8'
};

const sizeToTextMap: Record<ComponentSize, string> = {
    'xs': 'text-xs',
    'sm': 'text-sm',
    'default': 'text-base',
    'md': 'text-base',
    'lg': 'text-lg',
    'xl': 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    'icon': 'text-base',
    'roundIcon': 'text-base'
};

const sizeToIconMap: Record<ComponentSize, number> = {
    'xs': 12,
    'sm': 14,
    'default': 16,
    'md': 18,
    'lg': 20,
    'xl': 22,
    '2xl': 24,
    '3xl': 28,
    'icon': 18,
    'roundIcon': 18
};

type SelectProps = {
    options: { value: string; label: string }[];
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    isLoading?: boolean;
    disabled?: boolean;
    error?: boolean;
    size?: ComponentSize;
    variant?: ButtonVariant;
    className?: string;
    triggerClassName?: string;
    label?: string;
    description?: string;
    icon?: LucideIcon;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

// Original Select Component (Single Select)
const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
    ({
         options,
         value,
         onChange,
         placeholder = 'Select option',
         isLoading = false,
         disabled = false,
         error = false,
         size = 'default',
         variant = 'default',
         className,
         triggerClassName,
         label,
         description,
         icon: Icon,
         onClick,
         ...props
     }, ref) => {
        const isIconVariant = size === 'icon' || size === 'roundIcon';
        const iconSize = sizeToIconMap[size];

        return (
            <div className={cn('grid gap-1.5', className)}>
                {label && !isIconVariant && (
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {label}
                    </label>
                )}
                <SelectPrimitive.Root value={value} onValueChange={onChange}>
                    <SelectPrimitive.Trigger
                        ref={ref}
                        onClick={onClick}
                        className={cn(
                            'flex items-center justify-between border',
                            'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                            {
                                'rounded-full': size === 'roundIcon',
                                'rounded-md': size !== 'roundIcon',
                                'p-0': isIconVariant,
                                'px-3': !isIconVariant,
                                'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive',
                                'bg-success text-success-foreground hover:bg-success/90': variant === 'success',
                                'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
                                'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'primary',
                                'border-input bg-background hover:bg-accent hover:text-accent-foreground': variant === 'outline',
                                'border-none shadow-none': variant === 'ghost',
                                'h-8 min-w-[2.5rem]': isIconVariant, // Increased minimum width for icon variants
                                'w-full': !isIconVariant,
                            },
                            !isIconVariant && sizeToHeightMap[size],
                            sizeToTextMap[size],
                            error && 'border-destructive',
                            triggerClassName
                        )}
                        disabled={disabled || isLoading}
                    >
                        {isIconVariant ? (
                            <div className="relative flex items-center justify-center w-full">
                                {Icon && <Icon size={iconSize} />}
                                <SelectPrimitive.Icon className="ml-1 absolute -right-1 -bottom-1">
                                    {isLoading ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                         <ChevronDown className="h-3 w-3" />
                                     )}
                                </SelectPrimitive.Icon>
                            </div>
                        ) : (
                             <>
                                 <SelectPrimitive.Value placeholder={placeholder} />
                                 <SelectPrimitive.Icon className="ml-2">
                                     {isLoading ? (
                                         <Loader2 className="h-4 w-4 animate-spin" />
                                     ) : (
                                          <ChevronDown className="h-4 w-4" />
                                      )}
                                 </SelectPrimitive.Icon>
                             </>
                         )}
                    </SelectPrimitive.Trigger>

                    <SelectPrimitive.Portal>
                        <SelectPrimitive.Content
                            className={cn(
                                'relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                                isIconVariant && 'min-w-[8rem]' // Increased minimum width for icon variant dropdown
                            )}
                        >
                            <SelectPrimitive.Viewport className="p-1">
                                {options.map((option) => (
                                    <SelectPrimitive.Item
                                        key={option.value}
                                        value={option.value}
                                        className={cn(
                                            'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2',
                                            'outline-none focus:bg-accent focus:text-accent-foreground',
                                            'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                                            isIconVariant && 'text-base'
                                        )}
                                    >
                                        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                            <SelectPrimitive.ItemIndicator>
                                                <Check className="h-4 w-4" />
                                            </SelectPrimitive.ItemIndicator>
                                        </span>
                                        <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                                    </SelectPrimitive.Item>
                                ))}
                            </SelectPrimitive.Viewport>
                        </SelectPrimitive.Content>
                    </SelectPrimitive.Portal>
                </SelectPrimitive.Root>

                {description && !isIconVariant && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';

// New MultiSelect Component
type MultiSelectProps = Omit<SelectProps, 'value' | 'onChange'> & {
    value?: string[];
    onChange?: (value: string[]) => void;
};

const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
    ({
         options,
         value = [],
         onChange,
         placeholder = 'Select options',
         isLoading = false,
         disabled = false,
         error = false,
         size = 'default',
         variant = 'default',
         className,
         triggerClassName,
         label,
         description,
         icon: Icon,
         ...props
     }, ref) => {
        const [isOpen, setIsOpen] = React.useState(false);
        const [localSelectedValues, setLocalSelectedValues] = React.useState<string[]>(value);
        const containerRef = React.useRef<HTMLDivElement>(null);

        // Handle click outside
        React.useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            };

            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, []);

        // Sync with external value
        React.useEffect(() => {
            if (JSON.stringify(localSelectedValues) !== JSON.stringify(value)) {
                setLocalSelectedValues(value);
            }
        }, [value]);

        const toggleOption = (optionValue: string) => {
            const newValues = localSelectedValues.includes(optionValue)
                ? localSelectedValues.filter(v => v !== optionValue)
                : [...localSelectedValues, optionValue];
            setLocalSelectedValues(newValues);
            onChange?.(newValues);
        };

        const removeValue = (valueToRemove: string) => {
            const newValues = localSelectedValues.filter(v => v !== valueToRemove);
            setLocalSelectedValues(newValues);
            onChange?.(newValues);
        };

        return (
            <div className={cn('grid gap-1.5', className)}>
                {label && (
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <Button
                        ref={ref}
                        type="button"
                        variant={variant}
                        size={size}
                        className={cn(
                            'w-full justify-between',
                            error && 'border-destructive',
                            triggerClassName
                        )}
                        disabled={disabled || isLoading}
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        <span className="flex-1 text-left truncate">
                            {localSelectedValues.length === 0
                             ? placeholder
                             : `${localSelectedValues.length} selected`}
                        </span>
                        {isLoading ? (
                            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        ) : (
                             <ChevronDown className="ml-2 h-4 w-4" />
                         )}
                    </Button>

                    {isOpen && (
                        <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md">
                            <div className="p-1">
                                {options.map((option) => {
                                    const isSelected = localSelectedValues.includes(option.value);
                                    return (
                                        <div
                                            key={option.value}
                                            className={cn(
                                                'relative flex items-center space-x-2 px-2 py-1.5 cursor-pointer rounded-sm',
                                                'hover:bg-accent hover:text-accent-foreground',
                                                isSelected && 'bg-accent/50'
                                            )}
                                            onClick={() => toggleOption(option.value)}
                                        >
                                            <div className={cn(
                                                'flex h-4 w-4 items-center justify-center border rounded',
                                                isSelected && 'bg-primary border-primary'
                                            )}>
                                                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                            </div>
                                            <span>{option.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {localSelectedValues.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {localSelectedValues.map((selectedValue) => {
                            const option = options.find(opt => opt.value === selectedValue);
                            return (
                                <div
                                    key={selectedValue}
                                    className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                                >
                                    {option?.label}
                                    <button
                                        onClick={() => removeValue(selectedValue)}
                                        className="hover:text-destructive"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </div>
        );
    }
);

MultiSelect.displayName = 'MultiSelect';

export { Select, MultiSelect };
