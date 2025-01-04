'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

type DropdownPosition = {
    top: number;
    left: number;
    placement: 'top' | 'bottom';
    alignment: 'left' | 'right';
};

type MultiSelectDropdownProps = {
    isOpen: boolean;
    options: { value: string; label: string }[];
    selectedValues: string[];
    onOptionToggle: (value: string) => void;
    displayMode?: 'default' | 'icon';
    creatable?: boolean;
    createOptionPlaceholder?: string;
    onCreateOption?: () => void;
    inputValue: string;
    onInputChange: (value: string) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    triggerRef: React.RefObject<HTMLButtonElement>;
    preferredPlacement?: 'top' | 'bottom';
};

const DROPDOWN_MIN_WIDTH = 200; // Minimum width for the dropdown
const DROPDOWN_PADDING = 8; // Padding from viewport edges

const MultiSelectDropdown = React.forwardRef<HTMLDivElement, MultiSelectDropdownProps>(
    ({
        isOpen,
        options,
        selectedValues,
        onOptionToggle,
        displayMode = 'default',
        creatable = false,
        createOptionPlaceholder = 'Type to create...',
        onCreateOption,
        inputValue,
        onInputChange,
        onKeyDown,
        triggerRef,
        preferredPlacement = 'bottom'
    }, ref) => {
        const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null);
        const dropdownRef = React.useRef<HTMLDivElement>(null);
        const [position, setPosition] = React.useState<DropdownPosition | null>(null);

        // Create portal container
        React.useEffect(() => {
            if (!portalContainer) {
                const container = document.createElement('div');
                container.id = 'multi-select-dropdown-portal';
                document.body.appendChild(container);
                setPortalContainer(container);
            }

            return () => {
                if (portalContainer) {
                    document.body.removeChild(portalContainer);
                }
            };
        }, [portalContainer]);

        const calculatePosition = React.useCallback(() => {
            if (!triggerRef.current || !dropdownRef.current) return;

            const triggerRect = triggerRef.current.getBoundingClientRect();
            const dropdownRect = dropdownRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;

            // Calculate spaces
            const spaceBelow = viewportHeight - triggerRect.bottom;
            const spaceAbove = triggerRect.top;

            // Determine width and position
            const width = Math.max(DROPDOWN_MIN_WIDTH, triggerRect.width);
            let left = triggerRect.left;
            
            // Adjust horizontal position if it would overflow
            if (left + width > viewportWidth - DROPDOWN_PADDING) {
                left = Math.max(DROPDOWN_PADDING, viewportWidth - width - DROPDOWN_PADDING);
            }

            // Determine vertical placement
            let placement: 'top' | 'bottom' = preferredPlacement;
            if (preferredPlacement === 'bottom' && spaceBelow < dropdownRect.height && spaceAbove > dropdownRect.height) {
                placement = 'top';
            } else if (preferredPlacement === 'top' && spaceAbove < dropdownRect.height && spaceBelow > dropdownRect.height) {
                placement = 'bottom';
            }

            // Calculate final top position
            const top = placement === 'bottom'
                ? triggerRect.bottom + 4
                : triggerRect.top - dropdownRect.height - 4;

            setPosition({
                top,
                left,
                placement,
                alignment: 'left'
            });
        }, [triggerRef, preferredPlacement]);

        React.useEffect(() => {
            if (!isOpen) return;

            // Initial position calculation
            calculatePosition();

            // Handle scroll and resize
            const handleUpdate = () => {
                calculatePosition();
            };

            window.addEventListener('scroll', handleUpdate, true);
            window.addEventListener('resize', handleUpdate);

            // Use ResizeObserver for dropdown content changes
            const observer = new ResizeObserver(handleUpdate);
            if (dropdownRef.current) {
                observer.observe(dropdownRef.current);
            }

            return () => {
                window.removeEventListener('scroll', handleUpdate, true);
                window.removeEventListener('resize', handleUpdate);
                observer.disconnect();
            };
        }, [isOpen, calculatePosition]);

        if (!isOpen || !portalContainer || !position) return null;

        const content = (
            <div
                ref={dropdownRef}
                className={cn(
                    "fixed rounded-md border bg-popover shadow-md",
                    "max-h-[300px] overflow-auto"
                )}
                style={{
                    top: position.top,
                    left: position.left,
                    minWidth: DROPDOWN_MIN_WIDTH,
                    zIndex: 9999,
                }}
            >
                {creatable && (
                    <div className="p-1 border-b">
                        <Input
                            value={inputValue}
                            onChange={(e) => onInputChange(e.target.value)}
                            placeholder={createOptionPlaceholder}
                            className="h-8"
                            onKeyDown={onKeyDown}
                        />
                    </div>
                )}
                <div className="p-1">
                    {options.map((option) => {
                        const isSelected = selectedValues.includes(option.value);
                        return (
                            <div
                                key={option.value}
                                className={cn(
                                    'relative flex items-center space-x-2 px-2 py-1.5 cursor-pointer rounded-sm',
                                    'hover:bg-accent hover:text-accent-foreground',
                                    isSelected && 'bg-accent/50'
                                )}
                                onClick={() => onOptionToggle(option.value)}
                            >
                                <div
                                    className={cn(
                                        'flex h-4 w-4 items-center justify-center border rounded',
                                        isSelected && 'bg-primary border-primary'
                                    )}
                                >
                                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                </div>
                                <span>{option.label}</span>
                            </div>
                        );
                    })}
                    {creatable && inputValue.trim() && !options.length && (
                        <div
                            className="relative flex items-center space-x-2 px-2 py-1.5 cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={onCreateOption}
                        >
                            <Plus className="h-4 w-4" />
                            <span>Create "{inputValue}"</span>
                        </div>
                    )}
                </div>
            </div>
        );

        return createPortal(content, portalContainer);
    }
);

MultiSelectDropdown.displayName = 'MultiSelectDropdown';

export default MultiSelectDropdown;