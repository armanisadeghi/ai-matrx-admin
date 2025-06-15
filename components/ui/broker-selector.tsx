"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Plus, Database, Tag } from "lucide-react";
import { EnrichedBroker } from "@/features/workflows/utils/data-flow-manager";
import { DataFlowManager } from "@/features/workflows/utils/data-flow-manager";
import { toast } from "sonner";

interface BrokerSelectorProps {
    selectedBrokerId?: string;
    enrichedBrokers: EnrichedBroker[];
    workflowId: string;
    onBrokerSelect: (brokerId: string) => void;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
}

const BrokerSelector: React.FC<BrokerSelectorProps> = ({
    selectedBrokerId,
    enrichedBrokers,
    workflowId,
    onBrokerSelect,
    label = "Broker",
    placeholder = "Select or create a broker",
    disabled = false,
}) => {
    const [showCustomDialog, setShowCustomDialog] = useState(false);
    const [customBrokerId, setCustomBrokerId] = useState("");
    const [customBrokerName, setCustomBrokerName] = useState("");

    // Sort brokers: those with names first, then by usage frequency, then alphabetically
    const sortedBrokers = [...enrichedBrokers].sort((a, b) => {
        // Prioritize brokers with names
        const aHasName = !!(a.name || a.knownBrokerData?.name);
        const bHasName = !!(b.name || b.knownBrokerData?.name);
        
        if (aHasName !== bHasName) {
            return bHasName ? 1 : -1;
        }

        // Then by usage (more connections = higher priority)
        const aUsage = a.sourceNodes.length + a.targetNodes.length;
        const bUsage = b.sourceNodes.length + b.targetNodes.length;
        
        if (aUsage !== bUsage) {
            return bUsage - aUsage;
        }

        // Finally alphabetically by name or ID
        const aLabel = a.name || a.knownBrokerData?.name || a.id;
        const bLabel = b.name || b.knownBrokerData?.name || b.id;
        return aLabel.localeCompare(bLabel);
    });

    const selectedBroker = enrichedBrokers.find(broker => broker.id === selectedBrokerId);

    const handleCopyBrokerId = async (brokerId: string) => {
        try {
            await navigator.clipboard.writeText(brokerId);
            toast.success("Broker ID copied to clipboard");
        } catch (err) {
            toast.error("Failed to copy broker ID");
        }
    };

    const handleCreateCustomBroker = () => {
        if (!customBrokerId.trim()) {
            toast.error("Broker ID is required");
            return;
        }

        // Check if broker ID already exists
        if (enrichedBrokers.some(broker => broker.id === customBrokerId)) {
            toast.error("Broker ID already exists");
            return;
        }

        // Add to DataFlowManager (this will update the singleton instance)
        const dataFlowManager = DataFlowManager.getInstance(workflowId);
        
        // Create a new enriched broker entry
        const newBroker: EnrichedBroker = {
            id: customBrokerId,
            name: customBrokerName.trim() || undefined,
            isKnown: false,
            usageType: "source",
            sourceNodes: [],
            targetNodes: [],
            targetLabels: [],
        };

        // Add to the current list (parent component should handle state updates)
        onBrokerSelect(customBrokerId);
        
        // Reset form and close dialog
        setCustomBrokerId("");
        setCustomBrokerName("");
        setShowCustomDialog(false);
        
        toast.success("Custom broker created successfully");
    };

    const getBrokerDisplayName = (broker: EnrichedBroker) => {
        return broker.name || broker.knownBrokerData?.name || broker.id;
    };

    const getBrokerSubtext = (broker: EnrichedBroker) => {
        const connections = broker.sourceNodes.length + broker.targetNodes.length;
        const type = broker.usageType;
        return `${connections} connection${connections !== 1 ? 's' : ''} • ${type}`;
    };

    // If we have a selected broker, show the display card
    if (selectedBrokerId && selectedBroker) {
        const displayName = getBrokerDisplayName(selectedBroker);
        const showName = displayName !== selectedBroker.id;

        return (
            <div className="space-y-2">
                {label && <Label>{label}</Label>}
                <Card className="bg-muted/50 border-muted">
                    <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex-shrink-0">
                                    {selectedBroker.isKnown ? (
                                        <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    ) : (
                                        <Tag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    {showName && (
                                        <div className="font-medium text-sm text-foreground truncate">
                                            {displayName}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs font-mono bg-background px-1 py-0.5 rounded border">
                                            {selectedBroker.id}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => handleCopyBrokerId(selectedBroker.id)}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    {!showName && (
                                        <div className="text-xs text-muted-foreground">
                                            {getBrokerSubtext(selectedBroker)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onBrokerSelect("")}
                                disabled={disabled}
                            >
                                Change
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Otherwise show the selector
    return (
        <>
            <div className="space-y-2">
                {label && <Label>{label}</Label>}
                <div className="flex gap-2">
                    <Select
                        value={selectedBrokerId || ""}
                        onValueChange={onBrokerSelect}
                        disabled={disabled}
                    >
                        <SelectTrigger className="flex-1">
                            <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                            {sortedBrokers.map((broker) => {
                                const displayName = getBrokerDisplayName(broker);
                                const showName = displayName !== broker.id;
                                
                                return (
                                    <SelectItem key={broker.id} value={broker.id}>
                                        <div className="flex items-center gap-2 w-full">
                                            {broker.isKnown ? (
                                                <Database className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                            ) : (
                                                <Tag className="h-3 w-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    {showName && (
                                                        <span className="font-medium truncate">{displayName}</span>
                                                    )}
                                                    <code className="text-xs font-mono bg-muted px-1 rounded">
                                                        {broker.id}
                                                    </code>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {getBrokerSubtext(broker)}
                                                </div>
                                            </div>
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowCustomDialog(true)}
                        disabled={disabled}
                        title="Create custom broker"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Custom Broker</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="broker-id">Broker ID *</Label>
                            <Input
                                id="broker-id"
                                value={customBrokerId}
                                onChange={(e) => setCustomBrokerId(e.target.value)}
                                placeholder="Enter unique broker ID"
                                className="font-mono"
                            />
                            <p className="text-xs text-muted-foreground">
                                This ID will be used to reference this broker in the data flow
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="broker-name">Display Name (Optional)</Label>
                            <Input
                                id="broker-name"
                                value={customBrokerName}
                                onChange={(e) => setCustomBrokerName(e.target.value)}
                                placeholder="Enter a friendly name"
                            />
                            <p className="text-xs text-muted-foreground">
                                A human-readable name to make the broker easier to identify
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCustomDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateCustomBroker}>
                            Create Broker
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default BrokerSelector; 