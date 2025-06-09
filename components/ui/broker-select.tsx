"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Check, ChevronDown, Database, User, Repeat, FunctionSquare, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { BrokerInfo } from "@/features/workflows/utils/brokerCollector";
import { CustomFieldLabelAndHelpText } from "@/constants/app-builder-help-text";

interface BrokerOption {
    id: string;
    label: string;
    type: "user_input" | "relay" | "function_node" | "dependency_relay" | "manual";
    description?: string;
    producers?: number;
    consumers?: number;
}

interface BrokerSelectProps {
    value?: string;
    onValueChange: (value: string) => void;
    brokers?: BrokerInfo[];
    placeholder?: string;
    label?: string;
    description?: string;
    allowManualInput?: boolean;
    className?: string;
    showProducersOnly?: boolean;
    showConsumersOnly?: boolean;
    disabled?: boolean;
}

const getTypeIcon = (type: string) => {
    switch (type) {
        case "user_input":
            return <User className="w-3 h-3" />;
        case "relay":
            return <Repeat className="w-3 h-3" />;
        case "function_node":
        case "dependency_relay":
            return <FunctionSquare className="w-3 h-3" />;
        default:
            return <Database className="w-3 h-3" />;
    }
};

const getTypeColor = (type: string) => {
    switch (type) {
        case "user_input":
            return "text-blue-600 dark:text-blue-400";
        case "relay":
            return "text-purple-600 dark:text-purple-400";
        case "function_node":
            return "text-green-600 dark:text-green-400";
        case "dependency_relay":
            return "text-orange-600 dark:text-orange-400";
        default:
            return "text-gray-600 dark:text-gray-400";
    }
};

const getTypeBadgeColor = (type: string) => {
    switch (type) {
        case "user_input":
            return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200";
        case "relay":
            return "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200";
        case "function_node":
            return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200";
        case "dependency_relay":
            return "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200";
        default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200";
    }
};

export const BrokerSelect: React.FC<BrokerSelectProps> = ({
    value = "",
    onValueChange,
    brokers = [],
    placeholder = "Select or enter broker ID...",
    label,
    description,
    allowManualInput = true,
    className,
    showProducersOnly = false,
    showConsumersOnly = false,
    disabled = false,
}) => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const [isManualInput, setIsManualInput] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [open]);

    // Convert brokers to options
    const brokerOptions = useMemo(() => {
        let filteredBrokers = brokers;

        if (showProducersOnly) {
            filteredBrokers = brokers.filter((broker) => broker.producers.length > 0);
        } else if (showConsumersOnly) {
            filteredBrokers = brokers.filter((broker) => broker.consumers.length > 0);
        }

        return filteredBrokers.map((broker) => {
            // Determine primary type based on most common producer type
            const producerTypes = broker.producers.map((p) => p.connectionType);
            const primaryType =
                producerTypes.length > 0
                    ? producerTypes.reduce((a, b, i, arr) =>
                          arr.filter((v) => v === a).length >= arr.filter((v) => v === b).length ? a : b
                      )
                    : "function_node";

            // Create description from producers
            const producerNames = Array.from(new Set(broker.producers.map((p) => p.nodeName)));
            const description =
                producerNames.length > 0
                    ? `Produced by: ${producerNames.slice(0, 2).join(", ")}${
                          producerNames.length > 2 ? ` +${producerNames.length - 2} more` : ""
                      }`
                    : "No producers";

            return {
                id: broker.id,
                label: broker.id,
                type: primaryType as BrokerOption["type"],
                description,
                producers: broker.producers.length,
                consumers: broker.consumers.length,
            };
        });
    }, [brokers, showProducersOnly, showConsumersOnly]);

    // Group options by type
    const groupedOptions = useMemo(() => {
        const groups: Record<string, BrokerOption[]> = {};
        brokerOptions.forEach((option) => {
            if (!groups[option.type]) {
                groups[option.type] = [];
            }
            groups[option.type].push(option);
        });
        return groups;
    }, [brokerOptions]);

    const selectedOption = brokerOptions.find((option) => option.id === value);

    const handleSelect = (brokerId: string) => {
        onValueChange(brokerId);
        setInputValue(brokerId);
        setIsManualInput(false);
        setOpen(false);
    };

    const handleManualInput = (inputValue: string) => {
        setInputValue(inputValue);
        onValueChange(inputValue);
        setIsManualInput(true);
    };

    const copyBrokerId = (e: React.MouseEvent, brokerId: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(brokerId);
    };

    const typeLabels = {
        user_input: "User Inputs",
        relay: "Relays",
        function_node: "Functions",
        dependency_relay: "Dependencies",
    };

    return (
        <div className={cn("space-y-2", className)}>
            {label && (
                <CustomFieldLabelAndHelpText
                    fieldId="broker-select"
                    fieldLabel={label}
                    helpText={description}
                    required={false}
                    className="pt-2"
                />
            )}

            <div className="space-y-2">
                {/* Broker Select with improved dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(!open)}
                        className="w-full justify-between h-auto min-h-[40px] px-3 py-2"
                        disabled={disabled}
                    >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {selectedOption ? (
                                <>
                                    <div className={cn("flex-shrink-0", getTypeColor(selectedOption.type))}>
                                        {getTypeIcon(selectedOption.type)}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="font-mono text-sm truncate">{selectedOption.id}</div>
                                        {selectedOption.description && (
                                            <div className="text-xs text-muted-foreground truncate">{selectedOption.description}</div>
                                        )}
                                    </div>
                                    <Badge variant="outline" className={cn("text-xs", getTypeBadgeColor(selectedOption.type))}>
                                        {selectedOption.type.replace("_", " ")}
                                    </Badge>
                                </>
                            ) : (
                                <span className="text-muted-foreground">{placeholder}</span>
                            )}
                        </div>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>

                    {open && (
                        <div className="absolute top-full left-0 right-0 z-[9999] mt-1 max-h-[300px] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
                            <Command>
                                <CommandInput placeholder="Search brokers..." />
                                <CommandList className="max-h-[250px] overflow-y-auto">
                                    <CommandEmpty>
                                        {brokerOptions.length === 0 ? "No brokers available in workflow" : "No brokers found."}
                                    </CommandEmpty>

                                    {Object.entries(groupedOptions).map(([type, options]) => (
                                        <CommandGroup key={type} heading={typeLabels[type as keyof typeof typeLabels] || type}>
                                            {options.map((option) => (
                                                <CommandItem
                                                    key={option.id}
                                                    value={option.id}
                                                    onSelect={() => handleSelect(option.id)}
                                                    className="flex items-center gap-3 p-3 cursor-pointer"
                                                >
                                                    <div className={cn("flex-shrink-0", getTypeColor(option.type))}>
                                                        {getTypeIcon(option.type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-sm">{option.id}</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                                                                onClick={(e) => copyBrokerId(e, option.id)}
                                                            >
                                                                <Copy className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground truncate">{option.description}</div>
                                                        <div className="flex gap-2 mt-1">
                                                            {option.producers > 0 && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    {option.producers} producer{option.producers !== 1 ? "s" : ""}
                                                                </Badge>
                                                            )}
                                                            {option.consumers > 0 && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    {option.consumers} consumer{option.consumers !== 1 ? "s" : ""}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Check
                                                        className={cn("ml-auto h-4 w-4", value === option.id ? "opacity-100" : "opacity-0")}
                                                    />
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    ))}
                                </CommandList>
                            </Command>
                        </div>
                    )}
                </div>

                {/* Manual Input Field */}
                {allowManualInput && (
                    <div className="space-y-1">
                        <CustomFieldLabelAndHelpText
                            fieldId="broker-select-manual"
                            fieldLabel="Or enter manually:"
                            helpText="Enter the broker ID manually"
                            required={false}
                            className="pt-2"
                        />
                        <Input
                            value={inputValue}
                            onChange={(e) => handleManualInput(e.target.value)}
                            placeholder="Enter broker ID manually..."
                            className="font-mono text-sm"
                            disabled={disabled}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
