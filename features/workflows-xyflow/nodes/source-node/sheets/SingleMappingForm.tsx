"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FieldListTableOverlay from "@/features/applet/builder/modules/field-builder/FieldListTableOverlay";
import { brokerActions } from "@/lib/redux/brokerSlice";
import { BrokerMapEntry } from "@/lib/redux/brokerSlice/types";
import { useAppDispatch } from "@/lib/redux";
import { workflowActions } from "@/lib/redux/workflow/slice";
import { useToast } from "@/components/ui/use-toast";
import { BrokerSourceConfig } from "@/lib/redux/workflow/types";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectFieldLabel } from "@/lib/redux/app-builder/selectors/fieldSelectors";

interface SingleMappingFormProps {
    workflowId: string;
    onMappingCreated: () => void;
    onCancel: () => void;
}

const SingleMappingForm: React.FC<SingleMappingFormProps> = ({ 
    workflowId, 
    onMappingCreated, 
    onCancel 
}) => {
    const dispatch = useAppDispatch();
    const { toast } = useToast();

    // Local state for this single mapping only
    const [formData, setFormData] = useState({
        fieldComponentId: "",
        brokerId: "",
        source: "workflow" as string,
        sourceId: workflowId,
    });

    const [isFieldSelectorOpen, setIsFieldSelectorOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const fieldLabel = useAppSelector((state) => selectFieldLabel(state, formData.fieldComponentId));

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

    const handleCreateMapping = useCallback(async () => {
        if (!formData.fieldComponentId || !formData.brokerId.trim()) {
            toast({
                title: "Missing Information",
                description: "Please select a field component and enter a broker ID.",
                variant: "destructive",
            });
            return;
        }

        setIsCreating(true);

        try {
            // Create the broker map entry
            const mapEntry: BrokerMapEntry = {
                brokerId: formData.brokerId.trim(),
                mappedItemId: formData.fieldComponentId,
                source: formData.source,
                sourceId: formData.sourceId,
            };

            // Create the proper source config for user_input
            const newSource: BrokerSourceConfig<"user_input"> = {
                brokerId: formData.brokerId.trim(),
                scope: "workflow",
                sourceType: "user_input",
                sourceDetails: mapEntry,
            };

            // Ensure workflow is selected
            dispatch(workflowActions.selectWorkflow(workflowId));

            // Add to workflow sources with proper structure
            dispatch(workflowActions.addSource(newSource));

            // Add to broker registry
            dispatch(brokerActions.addOrUpdateRegisterEntry(mapEntry));

            toast({
                title: "Mapping Created",
                description: `Field mapping created successfully for broker ID: ${formData.brokerId}`,
            });

            // Reset form
            setFormData({
                fieldComponentId: "",
                brokerId: "",
                source: "workflow",
                sourceId: workflowId,
            });

            // Notify parent that mapping was created
            onMappingCreated();

        } catch (error) {
            console.error("Failed to create mapping:", error);
            toast({
                title: "Creation Failed",
                description: "Failed to create field mapping. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsCreating(false);
        }
    }, [formData, workflowId, dispatch, toast, onMappingCreated]);

    const handleSourceChange = useCallback((newSource: string) => {
        setFormData(prev => ({
            ...prev,
            source: newSource,
            sourceId: newSource === "workflow" ? workflowId : "",
        }));
    }, [workflowId]);

    const handleSourceIdChange = useCallback((sourceId: string) => {
        setFormData(prev => ({ ...prev, sourceId }));
    }, []);

    const handleBrokerIdChange = useCallback((brokerId: string) => {
        setFormData(prev => ({ ...prev, brokerId }));
    }, []);

    const isFormValid = formData.fieldComponentId && formData.brokerId.trim();

    return (
        <>
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="text-sm font-medium text-foreground mb-3">Create New User Input Source</div>
                
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

                {/* Broker ID */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Broker ID</Label>
                    <Input 
                        value={formData.brokerId} 
                        onChange={(e) => handleBrokerIdChange(e.target.value)} 
                        placeholder="Enter broker ID"
                        disabled={isCreating}
                    />
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

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={onCancel} 
                        className="flex-1"
                        disabled={isCreating}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleCreateMapping}
                        disabled={!isFormValid || isCreating}
                        className="flex-1"
                    >
                        {isCreating ? "Creating..." : "Create Source"}
                    </Button>
                </div>
            </div>

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

export default SingleMappingForm; 