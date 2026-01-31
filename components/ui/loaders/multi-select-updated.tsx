"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader2, X, Plus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ComponentSize } from "@/types/componentConfigTypes";
import { ButtonVariant } from "@/components/matrx/ArmaniForm/field-components/types";
import { Input } from "@/components/ui/input";

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
  displayMode?: "default" | "icon";
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
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
      placeholder = "Select options",
      isLoading = false,
      disabled = false,
      error = false,
      size = "default",
      variant = "default",
      className,
      triggerClassName,
      label,
      description,
      icon: Icon,
      showSelectedInDropdown = false,
      displayMode = "default",
      onClick,
      creatable = false,
      onCreateOption,
      createOptionPlaceholder = "Type to create...",
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [localSelectedValues, setLocalSelectedValues] =
      React.useState<string[]>(value);
    const [inputValue, setInputValue] = React.useState("");
    const [filteredOptions, setFilteredOptions] = React.useState(options);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [dropdownRect, setDropdownRect] = React.useState<{
      top: number;
      left: number;
      width: number;
    } | null>(null);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent | TouchEvent) => {
        const target = event.target as Node;
        const dropdown = document.querySelector("[data-multiselect-dropdown]");

        // Check if click is inside dropdown or trigger
        if (
          (dropdown && dropdown.contains(target)) ||
          (containerRef.current && containerRef.current.contains(target))
        ) {
          return;
        }

        setIsOpen(false);
      };

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }, [isOpen]);

    React.useEffect(() => {
      if (JSON.stringify(localSelectedValues) !== JSON.stringify(value)) {
        setLocalSelectedValues(value);
      }
    }, [value]);

    React.useEffect(() => {
      const calculatePosition = () => {
        if (containerRef.current && isOpen) {
          const rect = containerRef.current.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          const spaceAbove = rect.top;

          setDropdownRect({
            top:
              spaceBelow < 200 && spaceAbove > spaceBelow
                ? rect.top - 4
                : rect.bottom + 4,
            left: rect.left,
            width: rect.width,
          });
        }
      };

      if (isOpen) {
        calculatePosition();
        window.addEventListener("scroll", calculatePosition, true);
        window.addEventListener("resize", calculatePosition);
      } else {
        setDropdownRect(null);
      }

      return () => {
        window.removeEventListener("scroll", calculatePosition, true);
        window.removeEventListener("resize", calculatePosition);
      };
    }, [isOpen]);

    React.useEffect(() => {
      const filtered = options.filter((option) =>
        option.label.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    }, [options, inputValue]);

    const toggleOption = (optionValue: string, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();

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
          setInputValue("");
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
      if (e.key === "Enter" && creatable && inputValue.trim()) {
        e.preventDefault();
        createOption();
      }
    };

    return (
      <div
        ref={containerRef}
        className={cn("grid gap-1.5 relative", className)}
      >
        {label && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </label>
        )}

        <div className="relative">
          {/* @ts-ignore - ButtonVariant includes "success" but Button component doesn't support it */}
          <Button
            ref={ref}
            type="button"
            variant={variant}
            // @ts-ignore - Size type mismatch: ComponentSize includes "md"/"2xl"/"3xl" but Button size doesn't
            size={displayMode === "icon" ? "icon" : size}
            className={cn(
              displayMode === "icon"
                ? "relative p-2 flex items-center justify-center"
                : "w-full justify-between",
              error && "border-destructive",
              triggerClassName
            )}
            disabled={disabled || isLoading}
            onClick={handleButtonClick}
            {...props}
          >
            {displayMode === "icon" ? (
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

          {isOpen &&
            dropdownRect &&
            createPortal(
              <div
                ref={dropdownRef}
                data-multiselect-dropdown
                style={{
                  position: "fixed",
                  top: `${dropdownRect.top}px`,
                  left: `${dropdownRect.left}px`,
                  width: `${dropdownRect.width}px`,
                  zIndex: 9999,
                }}
                className={cn(
                  "rounded-md border bg-popover shadow-md",
                  dropdownRect.top < 200 && "transform -translate-y-full"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {creatable && (
                  <div className="p-1 border-b">
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={createOptionPlaceholder}
                      className="h-8"
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                )}

                <div className="p-1 max-h-[300px] overflow-auto">
                  {filteredOptions.map((option) => {
                    const isSelected = localSelectedValues.includes(
                      option.value
                    );
                    return (
                      <div
                        key={option.value}
                        className={cn(
                          "relative flex items-center space-x-2 px-2 py-1.5 cursor-pointer rounded-sm",
                          "hover:bg-accent hover:text-accent-foreground",
                          isSelected && "bg-accent/50"
                        )}
                        onClick={(e) => toggleOption(option.value, e)}
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 items-center justify-center border rounded",
                            isSelected && "bg-primary border-primary"
                          )}
                        >
                          {isSelected && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        <span>{option.label}</span>
                      </div>
                    );
                  })}
                  {creatable &&
                    inputValue.trim() &&
                    !filteredOptions.length && (
                      <div
                        className="relative flex items-center space-x-2 px-2 py-1.5 cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground"
                        onClick={createOption}
                      >
                        <Plus className="h-4 w-4" />
                        <span>Create "{inputValue}"</span>
                      </div>
                    )}
                </div>
              </div>,
              document.body
            )}
        </div>

        {!showSelectedInDropdown &&
          localSelectedValues.length > 0 &&
          displayMode !== "icon" && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {localSelectedValues.map((selectedValue) => {
                const option = options.find(
                  (opt) => opt.value === selectedValue
                );
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

MultiSelect.displayName = "MultiSelect";

export default MultiSelect;
