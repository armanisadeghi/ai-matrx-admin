"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FieldListTableOverlay from "@/features/applet/builder/modules/field-builder/FieldListTableOverlay";
import { brokerActions } from "@/lib/redux/brokerSlice";
import { BrokerMapEntry } from "@/lib/redux/brokerSlice/types";
import { useAppDispatch } from "@/lib/redux";
import { workflowActions } from "@/lib/redux/workflow/slice";
import { useToast } from "@/components/ui/use-toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectFieldLabel } from "@/lib/redux/app-builder/selectors/fieldSelectors";

import { BrokerSourceConfig, workflowsSelectors } from "@/lib/redux/workflow";
import BrokerSelect from "@/features/workflows-xyflow/common/BrokerSelect";

interface EditUserInputSourceProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    workflowId: string;
    brokerId: string;
    onSuccess?: () => void;
}

const EditUserInputSource: React.FC<EditUserInputSourceProps> = ({
    isOpen,
    onOpenChange,
    workflowId,
    brokerId,
    onSuccess,
}) => {
    const dispatch = useAppDispatch();
    const { toast } = useToast();

    // Get current source from Redux (single source of truth)
    const currentSource = useAppSelector((state) => 
        workflowsSelectors.userInputSourceByBrokerId(state, workflowId, brokerId)
    );

    // Local state for UI only - initialized from Redux state
    const [formData, setFormData] = useState({
        brokerId: "",
        fieldComponentId: "",
        source: "workflow" as string,
        sourceId: workflowId,
    });

    // UI state
    const [isFieldSelectorOpen, setIsFieldSelectorOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const fieldLabel = useAppSelector((state) => selectFieldLabel(state, formData.fieldComponentId));

    // Initialize form data from Redux state when source changes
    useEffect(() => {
        if (currentSource?.sourceDetails) {
            setFormData({
                brokerId: currentSource.brokerId,
                fieldComponentId: currentSource.sourceDetails.mappedItemId,
                source: currentSource.sourceDetails.source,
                sourceId: currentSource.sourceDetails.sourceId,
            });
        }
    }, [currentSource]);

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

    const handleBrokerChange = useCallback((newBrokerId: string) => {
        setFormData(prev => ({ ...prev, brokerId: newBrokerId }));
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



    const handleUpdate = useCallback(async () => {
        if (!formData.brokerId.trim() || !formData.fieldComponentId || !currentSource) {
            toast({
                title: "Validation Error",
                description: "Please ensure all fields are filled.",
                variant: "destructive",
            });
            return;
        }

        setIsUpdating(true);

        try {
            const mapEntry: BrokerMapEntry = {
                brokerId: formData.brokerId,
                mappedItemId: formData.fieldComponentId,
                source: formData.source,
                sourceId: formData.sourceId,
            };

            const updatedSource: BrokerSourceConfig<"user_input"> = {
                brokerId: formData.brokerId,
                scope: "workflow",
                sourceType: "user_input",
                relays: [],
                extraction: null,
                sourceDetails: mapEntry,
                metadata: {},
            };

            // If broker ID changed, we need to remove old and add new
            if (formData.brokerId !== currentSource.brokerId) {
                // Remove old source
                dispatch(workflowActions.removeSourceByBrokerId({ 
                    id: workflowId,
                    brokerId: currentSource.brokerId 
                }));

                // Add new source
                dispatch(workflowActions.addSource({
                    id: workflowId,
                    source: updatedSource
                }));

                // Remove old broker registry entry
                if (currentSource.sourceDetails) {
                    dispatch(brokerActions.removeRegisterEntry({
                        source: currentSource.sourceDetails.source,
                        mappedItemId: currentSource.sourceDetails.mappedItemId,
                    }));
                }
            } else {
                // Update existing source by removing and re-adding
                dispatch(workflowActions.removeSourceByBrokerId({ 
                    id: workflowId,
                    brokerId: currentSource.brokerId 
                }));
                dispatch(workflowActions.addSource({
                    id: workflowId,
                    source: updatedSource
                }));
            }

            // Update broker registry
            dispatch(brokerActions.addOrUpdateRegisterEntry(mapEntry));

            toast({
                title: "Source Updated",
                description: "User input source updated successfully.",
            });

            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error("Failed to update source:", error);
            toast({
                title: "Update Failed",
                description: "Failed to update user input source. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsUpdating(false);
        }
    }, [formData, currentSource, workflowId, dispatch, toast, onOpenChange, onSuccess]);

    const handleDelete = useCallback(async () => {
        if (!currentSource) return;

        setIsDeleting(true);

        try {
            // Remove from workflow sources
            dispatch(workflowActions.removeSourceByBrokerId({ 
                id: workflowId,
                brokerId: currentSource.brokerId 
            }));

            // Remove from broker registry
            if (currentSource.sourceDetails) {
                dispatch(brokerActions.removeRegisterEntry({
                    source: currentSource.sourceDetails.source,
                    mappedItemId: currentSource.sourceDetails.mappedItemId,
                }));
            }

            toast({
                title: "Source Deleted",
                description: "User input source deleted successfully.",
            });

            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error("Failed to delete source:", error);
            toast({
                title: "Delete Failed",
                description: "Failed to delete user input source. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    }, [currentSource, dispatch, toast, onOpenChange, onSuccess]);

    const isFormValid = formData.fieldComponentId && formData.brokerId.trim();
    const hasChanges = currentSource?.sourceDetails && (
        formData.brokerId !== currentSource.brokerId ||
        formData.fieldComponentId !== currentSource.sourceDetails.mappedItemId ||
        formData.source !== currentSource.sourceDetails.source ||
        formData.sourceId !== currentSource.sourceDetails.sourceId
    );

    // Don't render if no current source
    if (!currentSource) {
        return null;
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit User Input Source</DialogTitle>
                        <DialogDescription>
                            Edit the configuration for this user input source.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Broker Selection */}
                        <BrokerSelect
                            value={formData.brokerId}
                            onValueChange={handleBrokerChange}
                            disabled={isUpdating || isDeleting}
                        />

                        {/* Field Component */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Field Component</Label>
                            <Button
                                variant="outline"
                                onClick={() => setIsFieldSelectorOpen(true)}
                                className="w-full justify-start"
                                disabled={isUpdating || isDeleting}
                            >
                                {fieldLabel || formData.fieldComponentId || "Browse Fields"}
                            </Button>
                        </div>

                        {/* Source (Scope) */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Source (Scope)</Label>
                            <Select 
                                value={formData.source} 
                                onValueChange={handleSourceChange} 
                                disabled={isUpdating || isDeleting}
                            >
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
                                disabled={isUpdating || isDeleting}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2">
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={handleDelete} 
                            disabled={isUpdating || isDeleting} 
                            className="mr-auto"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {isDeleting ? "Deleting..." : "Delete"}
                        </Button>

                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => onOpenChange(false)} 
                            disabled={isUpdating || isDeleting}
                        >
                            Close
                        </Button>

                        <Button 
                            size="sm" 
                            onClick={handleUpdate} 
                            disabled={!isFormValid || !hasChanges || isUpdating || isDeleting}
                        >
                            {isUpdating ? "Updating..." : "Update Source"}
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

export default EditUserInputSource; 