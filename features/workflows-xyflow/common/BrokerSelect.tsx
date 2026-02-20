"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataBrokerWithFetch } from "@/lib/redux/entity/hooks/entityUsedHooks";

interface BrokerSelectProps {
    value: string;
    onValueChange: (brokerId: string) => void;
    disabled?: boolean;
    placeholder?: string;
    label?: string;
    className?: string;
}

const BrokerSelect: React.FC<BrokerSelectProps> = ({
    value,
    onValueChange,
    disabled = false,
    placeholder = "Select a broker...",
    label = "Broker",
    className,
}) => {
    const { dataBrokerRecordsById } = useDataBrokerWithFetch();

    // UI state
    const [isManualBroker, setIsManualBroker] = useState(false);
    const [isBrokerSelectOpen, setIsBrokerSelectOpen] = useState(false);
    const [brokerSearch, setBrokerSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Get sorted brokers for display
    const sortedBrokers = useMemo(() => {
        return Object.values(dataBrokerRecordsById).sort((a, b) => {
            const nameA = (a.name || a.id).toLowerCase();
            const nameB = (b.name || b.id).toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }, [dataBrokerRecordsById]);

    // Filter brokers based on search
    const filteredBrokers = useMemo(() => {
        if (!brokerSearch.trim()) return sortedBrokers;
        
        const searchLower = brokerSearch.toLowerCase();
        return sortedBrokers.filter(broker => 
            (broker.name || broker.id).toLowerCase().includes(searchLower) ||
            broker.id.toLowerCase().includes(searchLower)
        );
    }, [sortedBrokers, brokerSearch]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsBrokerSelectOpen(false);
            }
        };

        if (isBrokerSelectOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isBrokerSelectOpen]);

    const handleBrokerSelect = useCallback((brokerId: string) => {
        onValueChange(brokerId);
        setIsBrokerSelectOpen(false);
        setBrokerSearch("");
    }, [onValueChange]);

    const handleBrokerIdChange = useCallback((brokerId: string) => {
        onValueChange(brokerId);
    }, [onValueChange]);

    const resetSearch = useCallback(() => {
        setBrokerSearch("");
    }, []);

    // Reset search when switching modes
    useEffect(() => {
        resetSearch();
    }, [isManualBroker, resetSearch]);

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{label}</Label>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsManualBroker(!isManualBroker)}
                    disabled={disabled}
                >
                    {isManualBroker ? "Use Database Selection" : "Enter Manually"}
                </Button>
            </div>

            {isManualBroker ? (
                <Input
                    value={value}
                    onChange={(e) => handleBrokerIdChange(e.target.value)}
                    placeholder="Enter broker ID manually"
                    disabled={disabled}
                />
            ) : (
                <div className="relative" ref={dropdownRef}>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isBrokerSelectOpen}
                        className="w-full justify-between"
                        disabled={disabled}
                        onClick={() => setIsBrokerSelectOpen(!isBrokerSelectOpen)}
                    >
                        {value
                            ? dataBrokerRecordsById[value]?.name || value
                            : placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                    {isBrokerSelectOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-[400px] flex flex-col">
                            <div className="p-2 border-b">
                                <Input
                                    placeholder="Search brokers..."
                                    value={brokerSearch}
                                    onChange={(e) => setBrokerSearch(e.target.value)}
                                    className="h-8"
                                    autoFocus
                                />
                            </div>
                            <div className="max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                                {filteredBrokers.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No broker found.
                                    </div>
                                ) : (
                                    filteredBrokers.map((broker) => (
                                        <div
                                            key={broker.id}
                                            onClick={() => handleBrokerSelect(broker.id)}
                                            className="flex items-center p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value === broker.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex flex-col">
                                                <span className="font-medium">{broker.name || broker.id}</span>
                                                {broker.name && (
                                                    <span className="text-xs text-muted-foreground">ID: {broker.id}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BrokerSelect; 