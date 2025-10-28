"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { getAvailableServices } from "@/constants/socket-schema";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { formatText } from "@/utils/text/text-case-converter";

interface ServiceSelectorProps {
  onServiceChange?: (service: string) => void;
  compact?: boolean;
}

export function ServiceSelector({ onServiceChange, compact = false }: ServiceSelectorProps) {
  const dispatch = useAppDispatch();
  const [selectedService, setSelectedService] = React.useState("");

  const handleServiceChange = (value: string) => {
    setSelectedService(value);
    if (onServiceChange) {
      onServiceChange(value);
    }
  };

  return (
    <Select
      value={selectedService}
      onValueChange={handleServiceChange}
    >
      <SelectTrigger className={`
        bg-gray-200 dark:bg-gray-900 border-1 border-gray-400 dark:border-gray-500 
        ${compact 
          ? "h-8 text-xs rounded-xl px-2" 
          : "rounded-3xl"
        }
      `}>
        <SelectValue placeholder={compact ? "Service..." : "Select a service..."} />
      </SelectTrigger>
      <SelectContent>
        {getAvailableServices().map(({ value, label }) => (
          <SelectItem
            key={value}
            value={value}
            className="bg-gray-200 dark:bg-gray-900 hover:bg-gray-300 dark:hover:bg-gray-800 cursor-pointer"
          >
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 