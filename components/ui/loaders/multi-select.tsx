'use client';

import * as React from 'react';
import { Check, ChevronDown, Loader2, X, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ComponentSize } from '@/types/componentConfigTypes';
import { ButtonVariant } from '@/components/matrx/ArmaniForm/field-components/types';


type MultiSelectProps = {
    options: { value: string; label: string }[];
    value?: string[];
    onChange?: (value: string[]) => void;
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
    showSelectedInDropdown?: boolean;
    displayMode?: 'default' | 'icon';
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
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
         showSelectedInDropdown = false,
         displayMode = 'default',
         onClick,
         ...props
     }, ref) => {
        const [isOpen, setIsOpen] = React.useState(false);
        const [localSelectedValues, setLocalSelectedValues] = React.useState<string[]>(value);
        const containerRef = React.useRef<HTMLDivElement>(null);
        const [dropdownPosition, setDropdownPosition] = React.useState<'bottom' | 'top'>('bottom');

        React.useEffect(() => {
            const handleClickOutside = (event: MouseEvent | TouchEvent) => {
                if (!containerRef.current) return;

                const target = event.target as Node;
                if (!containerRef.current.contains(target)) {
                    setIsOpen(false);
                }
            };

            const handleEscape = (event: KeyboardEvent) => {
                if (event.key === 'Escape') {
                    setIsOpen(false);
                }
            };

            // Only add listeners if the dropdown is open
            if (isOpen) {
                document.addEventListener('mousedown', handleClickOutside);
                document.addEventListener('touchstart', handleClickOutside);
                document.addEventListener('keydown', handleEscape);
            }

            // Cleanup
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('touchstart', handleClickOutside);
                document.removeEventListener('keydown', handleEscape);
            };
        }, [isOpen]);

        React.useEffect(() => {
            const calculatePosition = () => {
                if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const spaceAbove = rect.top;
                    setDropdownPosition(spaceBelow < 200 && spaceAbove > spaceBelow ? 'top' : 'bottom');
                }
            };

            if (isOpen) {
                calculatePosition();
                window.addEventListener('scroll', calculatePosition, true);
                window.addEventListener('resize', calculatePosition);
            }

            return () => {
                window.removeEventListener('scroll', calculatePosition, true);
                window.removeEventListener('resize', calculatePosition);
            };
        }, [isOpen]);

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

        const handleButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
            if (!disabled && !isLoading) {
                setIsOpen(!isOpen);
                onClick?.(event);
            }
        };

        return (
            <div ref={containerRef} className={cn('grid gap-1.5 relative', className)}>
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
                        size={displayMode === 'icon' ? 'icon' : size}
                        className={cn(
                            displayMode === 'icon'
                            ? 'relative p-2 flex items-center justify-center'
                            : 'w-full justify-between',
                            error && 'border-destructive',
                            triggerClassName
                        )}
                        disabled={disabled || isLoading}
                        onClick={handleButtonClick}
                        {...props}
                    >
                        {displayMode === 'icon' ? (
                            <>
                                {Icon && <Icon className="h-4 w-4" />}
                                {localSelectedValues.length > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                                        {localSelectedValues.length}
                                    </span>
                                )}
                            </>
                        ) : (
                             <>
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
                             </>
                         )}
                    </Button>

                    {isOpen && (
                        <div
                            className={cn(
                                "absolute z-50 w-[200px] rounded-md border bg-popover shadow-md",
                                dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1',
                                displayMode === 'icon' && 'right-0'
                            )}
                        >
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

                {!showSelectedInDropdown && localSelectedValues.length > 0 && displayMode !== 'icon' && (
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

export default MultiSelect;
