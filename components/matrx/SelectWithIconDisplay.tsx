"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { AdvancedTooltip } from "./Tooltip";

type Item = {
  icon: React.ElementType;
  label: string;
  value: string;
};

type SelectWithIconDisplayProps = {
  items: Item[];
  onChange?: (selectedItems: Item[]) => void;
  placeholder?: string;
  maxHeight?: string;
  className?: string;
};

const SelectWithIconDisplay = ({
  items,
  onChange,
  placeholder = "Select items...",
  maxHeight = "max-h-60",
  className = "",
}: SelectWithIconDisplayProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleItem = (item: Item) => {
    setSelectedItems((prev) => {
      const newItems = prev.find((i) => i.value === item.value)
        ? prev.filter((i) => i.value !== item.value)
        : [...prev, item];

      onChange?.(newItems);
      return newItems;
    });
  };

  return (
    <div className={`w-full space-y-3 ${className}`}>
      {/* Select Button */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full min-w-0 bg-elevation1 rounded-md p-2 text-sm 
                    flex items-center justify-between border border-elevation3"
        >
          <span className="truncate text-sm">{placeholder}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className={`absolute z-10 w-full mt-1 bg-elevation1 border 
                          border-elevation3 rounded-md shadow-lg ${maxHeight} overflow-auto`}
          >
            {items.map((item) => {
              const isSelected = selectedItems.find(
                (i) => i.value === item.value
              );
              const Icon = item.icon;

              return (
                <button
                  key={item.value}
                  onClick={() => toggleItem(item)}
                  className="w-full px-3 py-2 text-left text-sm
                           hover:bg-elevation3/50 flex items-center justify-between
                           first:rounded-t-md last:rounded-b-md"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 opacity-70" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 opacity-70" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Items Display */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedItems.map((item) => {
            const Icon = item.icon;
            return (
              <AdvancedTooltip
                key={item.value}
                text={`Click to Remove ${item.label}`}
                variant="warning"
              >
                <button
                  onClick={() => toggleItem(item)}
                  className="flex items-center justify-center p-1.5 rounded-md
              opacity-70 hover:opacity-100 transition-all duration-200
              group relative"
                  aria-label={`Remove ${item.label}`}
                >
                  <Icon className="w-5 h-5 group-hover:text-destructive transition-colors" />
                  <div
                    className="absolute inset-0 flex items-center justify-center 
                opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-12 h-12 text-muted-foreground" />
                  </div>
                </button>
              </AdvancedTooltip>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SelectWithIconDisplay;
