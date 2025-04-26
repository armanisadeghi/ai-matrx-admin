"use client";

import * as React from "react";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectTrigger 
} from "@/components/ui/select";

export interface IconSelectItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  value: string;
}

export interface IconSelectProps {
  items: IconSelectItem[];
  icon?: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
}

/**
 * IconSelect - A simple icon-only select component based on the NavigationSelectIcon
 * that was proven to work correctly across the application.
 */
const IconSelect = ({
  items,
  icon,
  value,
  onValueChange,
  triggerClassName = "",
  contentClassName = "",
  disabled = false,
}: IconSelectProps) => {
  return (
    <Select 
      value={value} 
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger 
        className={`h-7 w-7 px-0 bg-gray-200 dark:bg-gray-900 border-none justify-center focus:outline-none focus:ring-0 ${triggerClassName}`} 
        hideArrow={true}
      >
        {icon}
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem 
              key={item.id} 
              value={item.value}
            >
              <div className="flex items-center">
                {item.icon && (
                  <span className="mr-2">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default IconSelect; 