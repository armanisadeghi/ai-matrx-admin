'use client';

import * as React from 'react';
import { ChevronDown, Loader2, X, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ComponentSize } from '@/types/componentConfigTypes';
import { ButtonVariant } from '@/components/matrx/ArmaniForm/field-components/types';
import MultiSelectDropdown from './MultiSelectDropdown';

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
    creatable?: boolean;
    onCreateOption?: (inputValue: string) => string | null;
    createOptionPlaceholder?: string;
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
        creatable = false,
        onCreateOption,
        createOptionPlaceholder = 'Type to create...',
        ...props
    }, ref) => {
        const [isOpen, setIsOpen] = React.useState(false);
        const [localSelectedValues, setLocalSelectedValues] = React.useState<string[]>(value);
        const [inputValue, setInputValue] = React.useState('');
        const [filteredOptions, setFilteredOptions] = React.useState(options);
        const buttonRef = React.useRef<HTMLButtonElement>(null);

        // Sync with external value
        React.useEffect(() => {
            if (JSON.stringify(localSelectedValues) !== JSON.stringify(value)) {
                setLocalSelectedValues(value);
            }
        }, [value]);

        // Handle click outside - modified for portal
        React.useEffect(() => {
            if (!isOpen) return;

            const handleClickOutside = (event: MouseEvent | TouchEvent) => {
                const target = event.target as Node;
                const portalElement = document.getElementById('multi-select-dropdown-portal');
                
                // Check if click is inside button or dropdown
                if (buttonRef.current?.contains(target) || portalElement?.contains(target)) {
                    return;
                }
                
                setIsOpen(false);
            };

            const handleEscape = (event: KeyboardEvent) => {
                if (event.key === 'Escape') {
                    setIsOpen(false);
                }
            };

            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
            document.addEventListener('keydown', handleEscape);

            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('touchstart', handleClickOutside);
                document.removeEventListener('keydown', handleEscape);
            };
        }, [isOpen]);

        // Filter options based on input
        React.useEffect(() => {
            const filtered = options.filter(option =>
                option.label.toLowerCase().includes(inputValue.toLowerCase())
            );
            setFilteredOptions(filtered);
        }, [options, inputValue]);

        const toggleOption = (optionValue: string) => {
            const newValues = localSelectedValues.includes(optionValue)
                ? localSelectedValues.filter(v => v !== optionValue)
                : [...localSelectedValues, optionValue];
            setLocalSelectedValues(newValues);
            onChange?.(newValues);
        };

        const createOption = () => {
            if (creatable && onCreateOption && inputValue.trim()) {
                const newId = onCreateOption(inputValue.trim());
                if (newId) {
                    toggleOption(newId);
                    setInputValue('');
                }
            }
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

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && creatable && inputValue.trim()) {
                e.preventDefault();
                createOption();
            }
        };

        // Forward the ref to both the button and the internal buttonRef
        React.useImperativeHandle(ref, () => buttonRef.current!);

        return (
            <div className={cn('grid gap-1.5', className)}>
                {label && (
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <Button
                        ref={buttonRef}
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

                    <MultiSelectDropdown
                        isOpen={isOpen}
                        options={filteredOptions}
                        selectedValues={localSelectedValues}
                        onOptionToggle={toggleOption}
                        displayMode={displayMode}
                        creatable={creatable}
                        createOptionPlaceholder={createOptionPlaceholder}
                        onCreateOption={createOption}
                        inputValue={inputValue}
                        onInputChange={setInputValue}
                        onKeyDown={handleKeyDown}
                        triggerRef={buttonRef}
                    />
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