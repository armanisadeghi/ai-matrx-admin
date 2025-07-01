"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FieldListTableOverlay from "@/features/applet/builder/modules/field-builder/FieldListTableOverlay";
import { brokerActions } from "@/lib/redux/brokerSlice";
import { BrokerMapEntry } from "@/lib/redux/brokerSlice/types";
import { useAppDispatch } from "@/lib/redux";
import { workflowActions } from "@/lib/redux/workflow/slice";
import { useToast } from "@/components/ui/use-toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectFieldLabel } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { useDataBrokerWithFetch } from "@/lib/redux/entity/hooks/entityMainHooks";
import { BrokerSourceConfig } from "@/lib/redux/workflow";

interface CreateUserInputSourceProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    workflowId: string;
    onSuccess?: () => void;
}

const CreateUserInputSource: React.FC<CreateUserInputSourceProps> = ({
    isOpen,
    onOpenChange,
    workflowId,
    onSuccess,
}) => {
    const dispatch = useAppDispatch();
    const { toast } = useToast();
    const { dataBrokerRecordsById } = useDataBrokerWithFetch();

    // Local state for the form
    const [formData, setFormData] = useState({
        brokerId: "",
        fieldComponentId: "",
        source: "workflow" as string,
        sourceId: workflowId,
    });

    // UI state
    const [isFieldSelectorOpen, setIsFieldSelectorOpen] = useState(false);
    const [isManualBroker, setIsManualBroker] = useState(false);
    const [isBrokerSelectOpen, setIsBrokerSelectOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const fieldLabel = useAppSelector((state) => selectFieldLabel(state, formData.fieldComponentId));

    // Get sorted brokers for display
    const sortedBrokers = useMemo(() => {
        return Object.values(dataBrokerRecordsById).sort((a, b) => {
            const nameA = (a.name || a.id).toLowerCase();
            const nameB = (b.name || b.id).toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }, [dataBrokerRecordsById]);

    const resetForm = useCallback(() => {
        setFormData({
            brokerId: "",
            fieldComponentId: "",
            source: "workflow",
            sourceId: workflowId,
        });
        setIsManualBroker(false);
    }, [workflowId]);

    const handleFieldSelect = useCallback((fieldId: string) => {
        setFormData(prev => ({ ...prev, fieldComponentId: fieldId }));
        setIsFieldSelectorOpen(false);
    }, []);

    const handleFieldCreated = useCallback((fieldId: string) => {
        setFormData(prev => ({ ...prev, fieldComponentId: fieldId }));
        setIsFieldSelectorOpen(false);
        toast({
            title: "Field Created",
            description: "Field component created successfully and selected for mapping.",
        });
    }, [toast]);

    const handleFieldUpdated = useCallback((fieldId: string) => {
        toast({
            title: "Field Updated",
            description: "Field component updated successfully.",
        });
    }, [toast]);

    const handleBrokerSelect = useCallback((brokerId: string) => {
        setFormData(prev => ({ ...prev, brokerId }));
        setIsBrokerSelectOpen(false);
    }, []);

    const handleSourceChange = useCallback((newSource: string) => {
        setFormData(prev => ({
            ...prev,
            source: newSource,
            sourceId: newSource === "workflow" ? workflowId : prev.sourceId,
        }));
    }, [workflowId]);

    const handleSourceIdChange = useCallback((sourceId: string) => {
        setFormData(prev => ({ ...prev, sourceId }));
    }, []);

    const handleBrokerIdChange = useCallback((brokerId: string) => {
        setFormData(prev => ({ ...prev, brokerId }));
    }, []);

    const handleCreate = useCallback(async () => {
        if (!formData.brokerId.trim() || !formData.fieldComponentId) {
            toast({
                title: "Validation Error",
                description: "Please select both a broker and field component.",
                variant: "destructive",
            });
            return;
        }

        setIsCreating(true);

        try {
            const mapEntry: BrokerMapEntry = {
                brokerId: formData.brokerId,
                mappedItemId: formData.fieldComponentId,
                source: formData.source,
                sourceId: formData.sourceId,
            };

            const newSource: BrokerSourceConfig<"user_input"> = {
                brokerId: formData.brokerId,
                scope: "workflow",
                sourceType: "user_input",
                sourceDetails: mapEntry,
            };

            // Ensure workflow is selected
            dispatch(workflowActions.selectWorkflow(workflowId));

            // Add the source
            dispatch(workflowActions.addSource(newSource));

            // Update broker registry
            dispatch(brokerActions.addOrUpdateRegisterEntry(mapEntry));

            toast({
                title: "Source Created",
                description: "User input source created successfully.",
            });

            resetForm();
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error("Failed to create source:", error);
            toast({
                title: "Creation Failed",
                description: "Failed to create user input source. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsCreating(false);
        }
    }, [formData, workflowId, dispatch, toast, resetForm, onOpenChange, onSuccess]);

    const handleCancel = useCallback(() => {
        resetForm();
        onOpenChange(false);
    }, [resetForm, onOpenChange]);

    const isFormValid = formData.fieldComponentId && formData.brokerId.trim();

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create User Input Source</DialogTitle>
                        <DialogDescription>
                            Create a new user input source for this workflow.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Broker Selection */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Broker</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsManualBroker(!isManualBroker)}
                                    disabled={isCreating}
                                >
                                    {isManualBroker ? "Use Database Selection" : "Enter Manually"}
                                </Button>
                            </div>

                            {isManualBroker ? (
                                <Input
                                    value={formData.brokerId}
                                    onChange={(e) => handleBrokerIdChange(e.target.value)}
                                    placeholder="Enter broker ID manually"
                                    disabled={isCreating}
                                />
                            ) : (
                                <Popover open={isBrokerSelectOpen} onOpenChange={setIsBrokerSelectOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={isBrokerSelectOpen}
                                            className="w-full justify-between"
                                            disabled={isCreating}
                                        >
                                            {formData.brokerId ? 
                                                dataBrokerRecordsById[formData.brokerId]?.name || formData.brokerId : 
                                                "Select a broker..."
                                            }
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                        <Command>
                                            <CommandInput placeholder="Search brokers..." />
                                            <CommandList>
                                                <CommandEmpty>No broker found.</CommandEmpty>
                                                <CommandGroup>
                                                    {sortedBrokers.map((broker) => (
                                                        <CommandItem
                                                            key={broker.id}
                                                            value={`${broker.name || broker.id} ${broker.id}`}
                                                            onSelect={() => handleBrokerSelect(broker.id)}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    formData.brokerId === broker.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{broker.name || broker.id}</span>
                                                                {broker.name && (
                                                                    <span className="text-xs text-muted-foreground">ID: {broker.id}</span>
                                                                )}
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>

                        {/* Field Component */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Field Component</Label>
                            <Button
                                variant="outline"
                                onClick={() => setIsFieldSelectorOpen(true)}
                                className="w-full justify-start"
                                disabled={isCreating}
                            >
                                {fieldLabel || formData.fieldComponentId || "Browse Fields"}
                            </Button>
                        </div>

                        {/* Source (Scope) */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Source (Scope)</Label>
                            <Select value={formData.source} onValueChange={handleSourceChange} disabled={isCreating}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="global">global</SelectItem>
                                    <SelectItem value="session">session</SelectItem>
                                    <SelectItem value="task">task</SelectItem>
                                    <SelectItem value="organization">organization</SelectItem>
                                    <SelectItem value="user">user</SelectItem>
                                    <SelectItem value="workflow">workflow</SelectItem>
                                    <SelectItem value="action">action</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Source ID */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Source ID</Label>
                            <Input
                                value={formData.sourceId}
                                onChange={(e) => handleSourceIdChange(e.target.value)}
                                placeholder="Enter source ID"
                                disabled={isCreating}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleCancel} disabled={isCreating}>
                            Cancel
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={handleCreate} 
                            disabled={!isFormValid || isCreating}
                        >
                            {isCreating ? "Creating..." : "Create Source"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Field Selector Overlay */}
            <FieldListTableOverlay
                isOpen={isFieldSelectorOpen}
                onOpenChange={setIsFieldSelectorOpen}
                onFieldSelect={handleFieldSelect}
                onFieldCreated={handleFieldCreated}
                onFieldUpdated={handleFieldUpdated}
                overlayTitle="Select Field Component"
                overlaySize="3xl"
                defaultPageSize={20}
                closeOnSelect={true}
                autoConfigureForOverlay={true}
                allowCreate={true}
                allowEdit={true}
                allowView={true}
                allowDelete={true}
                allowSelectAction={true}
                showStripedRows={true}
                allowRefresh={true}
            />
        </>
    );
};

export default CreateUserInputSource; 