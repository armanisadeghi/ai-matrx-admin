'use client';

import * as React from 'react';
import { Check, ChevronDown, Loader2, X, Plus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ComponentSize } from '@/types/componentConfigTypes';
import { ButtonVariant } from '@/components/matrx/ArmaniForm/field-components/types';
import { Input } from '@/components/ui/input';
import { Portal } from '@radix-ui/react-select';

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
    // New props for creation functionality
    creatable?: boolean;
    onCreateOption?: (inputValue: string) => string | null;
    createOptionPlaceholder?: string;
};

const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
    (
        {
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
        },
        ref
    ) => {
        const [isOpen, setIsOpen] = React.useState(false);
        const [localSelectedValues, setLocalSelectedValues] = React.useState<string[]>(value);
        const [inputValue, setInputValue] = React.useState('');
        const [filteredOptions, setFilteredOptions] = React.useState(options);
        const containerRef = React.useRef<HTMLDivElement>(null);
        const inputRef = React.useRef<HTMLInputElement>(null);
        const [dropdownPosition, setDropdownPosition] = React.useState<'bottom' | 'top'>('bottom');
        const [dropdownStyles, setDropdownStyles] = React.useState<React.CSSProperties>({});

        React.useEffect(() => {
            if (isOpen && containerRef.current) {
                const updatePosition = () => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;

                    const spaceBelow = window.innerHeight - rect.bottom;
                    const spaceAbove = rect.top;
                    const showAbove = spaceBelow < 200 && spaceAbove > spaceBelow;

                    setDropdownStyles({
                        position: 'fixed',
                        width: rect.width,
                        left: rect.left,
                        [showAbove ? 'bottom' : 'top']: showAbove ? window.innerHeight - rect.top + 4 : rect.bottom + 4,
                        maxHeight: Math.min(300, showAbove ? rect.top - 20 : window.innerHeight - rect.bottom - 20),
                        overflowY: 'auto',
                    });
                };

                updatePosition();
                window.addEventListener('scroll', updatePosition, true);
                window.addEventListener('resize', updatePosition);

                return () => {
                    window.removeEventListener('scroll', updatePosition, true);
                    window.removeEventListener('resize', updatePosition);
                };
            }
        }, [isOpen]);

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

            if (isOpen) {
                document.addEventListener('mousedown', handleClickOutside);
                document.addEventListener('touchstart', handleClickOutside);
                document.addEventListener('keydown', handleEscape);
            }

            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('touchstart', handleClickOutside);
                document.removeEventListener('keydown', handleEscape);
            };
        }, [isOpen]);

        React.useEffect(() => {
            if (JSON.stringify(localSelectedValues) !== JSON.stringify(value)) {
                setLocalSelectedValues(value);
            }
        }, [value]);

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

        // Filter options based on input
        React.useEffect(() => {
            const filtered = options.filter((option) => option.label.toLowerCase().includes(inputValue.toLowerCase()));
            setFilteredOptions(filtered);
        }, [options, inputValue]);

        const toggleOption = (optionValue: string) => {
            const newValues = localSelectedValues.includes(optionValue)
                ? localSelectedValues.filter((v) => v !== optionValue)
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
            const newValues = localSelectedValues.filter((v) => v !== valueToRemove);
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

        // Rest of the component remains the same until the dropdown...
        return (
            <div
                ref={containerRef}
                className={cn('grid gap-1.5 relative', className)}
            >
                {label && <label className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>{label}</label>}
                <div className='relative'>
                    <Button
                        ref={ref}
                        type='button'
                        variant={variant}
                        size={displayMode === 'icon' ? 'icon' : size}
                        className={cn(
                            displayMode === 'icon' ? 'relative p-2 flex items-center justify-center' : 'w-full justify-between',
                            error && 'border-destructive',
                            triggerClassName
                        )}
                        disabled={disabled || isLoading}
                        onClick={handleButtonClick}
                        {...props}
                    >
                        {displayMode === 'icon' ? (
                            <>
                                {Icon && <Icon className='h-4 w-4' />}
                                {localSelectedValues.length > 0 && (
                                    <span className='absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground'>
                                        {localSelectedValues.length}
                                    </span>
                                )}
                            </>
                        ) : (
                            <>
                                <span className='flex-1 text-left truncate'>
                                    {localSelectedValues.length === 0 ? placeholder : `${localSelectedValues.length} selected`}
                                </span>
                                {isLoading ? <Loader2 className='ml-2 h-4 w-4 animate-spin' /> : <ChevronDown className='ml-2 h-4 w-4' />}
                            </>
                        )}
                    </Button>

                    {isOpen && (
                        <Portal>
                            <div
                                className={cn('fixed z-50 rounded-md border bg-popover shadow-md', displayMode === 'icon' && 'right-0')}
                                style={dropdownStyles}
                            >
                                {creatable && (
                                    <div className='p-1 border-b'>
                                        <Input
                                            ref={inputRef}
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            placeholder={createOptionPlaceholder}
                                            className='h-8'
                                            onKeyDown={handleKeyDown}
                                        />
                                    </div>
                                )}
                                <div className='p-1'>
                                    {filteredOptions.map((option) => {
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
                                                <div
                                                    className={cn(
                                                        'flex h-4 w-4 items-center justify-center border rounded',
                                                        isSelected && 'bg-primary border-primary'
                                                    )}
                                                >
                                                    {isSelected && <Check className='h-3 w-3 text-primary-foreground' />}
                                                </div>
                                                <span>{option.label}</span>
                                            </div>
                                        );
                                    })}
                                    {creatable && inputValue.trim() && !filteredOptions.length && (
                                        <div
                                            className='relative flex items-center space-x-2 px-2 py-1.5 cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground'
                                            onClick={createOption}
                                        >
                                            <Plus className='h-4 w-4' />
                                            <span>Create "{inputValue}"</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Portal>
                    )}
                </div>

                {!showSelectedInDropdown && localSelectedValues.length > 0 && displayMode !== 'icon' && (
                    <div className='flex flex-wrap gap-1 mt-1.5'>
                        {localSelectedValues.map((selectedValue) => {
                            const option = options.find((opt) => opt.value === selectedValue);
                            return (
                                <div
                                    key={selectedValue}
                                    className='flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm'
                                >
                                    {option?.label}
                                    <button
                                        onClick={() => removeValue(selectedValue)}
                                        className='hover:text-destructive'
                                    >
                                        <X className='h-3 w-3' />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {description && <p className='text-sm text-muted-foreground'>{description}</p>}
            </div>
        );
    }
);

MultiSelect.displayName = 'MultiSelect';

export default MultiSelect;
