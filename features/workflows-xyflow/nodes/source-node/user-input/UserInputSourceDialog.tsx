"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FieldListTableOverlay from "@/features/applet/builder/modules/field-builder/FieldListTableOverlay";
import { brokerActions } from "@/lib/redux/brokerSlice";
import { BrokerMapEntry } from "@/lib/redux/brokerSlice/types";
import { useAppDispatch } from "@/lib/redux";
import { workflowActions } from "@/lib/redux/workflow/slice";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectFieldLabel } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { BrokerSourceConfig, workflowsSelectors } from "@/lib/redux/workflow";
import BrokerSelect from "@/features/workflows-xyflow/common/BrokerSelect";

interface UserInputSourceDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    workflowId: string;
    brokerId?: string;
    onSuccess?: () => void;
    onBack?: () => void;
}

const UserInputSourceDialog: React.FC<UserInputSourceDialogProps> = ({
    isOpen,
    onOpenChange,
    workflowId,
    brokerId,
    onSuccess,
    onBack,
}) => {
    const dispatch = useAppDispatch();

    // Check if mapping exists in Redux (regardless of whether we're "creating" or "editing")
    const existingSource = useAppSelector((state) => 
        brokerId ? workflowsSelectors.userInputSourceByBrokerId(state, workflowId, brokerId) : null
    );

    // Local state for the form
    const [formData, setFormData] = useState({
        brokerId: brokerId || "",
        fieldComponentId: "",
        source: "workflow",
        sourceId: workflowId,
    });

    // UI state
    const [isFieldSelectorOpen, setIsFieldSelectorOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const fieldLabel = useAppSelector((state) => selectFieldLabel(state, formData.fieldComponentId));

    // Initialize form data from Redux state if mapping exists
    useEffect(() => {
        if (existingSource?.sourceDetails) {
            setFormData({
                brokerId: existingSource.brokerId,
                fieldComponentId: existingSource.sourceDetails.mappedItemId,
                source: existingSource.sourceDetails.source,
                sourceId: existingSource.sourceDetails.sourceId,
            });
        } else {
            // Reset form when no existing source or when brokerId changes
            setFormData({
                brokerId: brokerId || "",
                fieldComponentId: "",
                source: "workflow",
                sourceId: workflowId,
            });
        }
    }, [existingSource, brokerId, workflowId]);

    const handleFieldSelect = useCallback((fieldId: string) => {
        setFormData(prev => ({ ...prev, fieldComponentId: fieldId }));
        setIsFieldSelectorOpen(false);
    }, []);

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

    const handleSubmit = useCallback(async () => {
        if (!formData.brokerId.trim() || !formData.fieldComponentId) {
            return;
        }

        setIsSubmitting(true);

        try {
            const mapEntry: BrokerMapEntry = {
                brokerId: formData.brokerId,
                mappedItemId: formData.fieldComponentId,
                source: formData.source,
                sourceId: formData.sourceId,
            };

            const sourceConfig: BrokerSourceConfig<"user_input"> = {
                brokerId: formData.brokerId,
                scope: "workflow",
                sourceType: "user_input",
                relays: [],
                extraction: null,
                sourceDetails: mapEntry,
                metadata: {},
            };

            // If there's an existing source, remove it first
            if (existingSource) {
                dispatch(workflowActions.removeSourceByBrokerId({ 
                    id: workflowId,
                    brokerId: existingSource.brokerId 
                }));

                // If broker ID changed, remove old registry entry
                if (existingSource.sourceDetails && formData.brokerId !== existingSource.brokerId) {
                    dispatch(brokerActions.removeRegisterEntry({
                        source: existingSource.sourceDetails.source,
                        mappedItemId: existingSource.sourceDetails.mappedItemId,
                    }));
                }
            }
            
            // Add the source (create or update)
            dispatch(workflowActions.addSource({
                id: workflowId,
                source: sourceConfig
            }));

            // Update broker registry
            dispatch(brokerActions.addOrUpdateRegisterEntry(mapEntry));

            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error("Failed to save source:", error);
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, workflowId, existingSource, dispatch, onOpenChange, onSuccess]);

    const handleDelete = useCallback(async () => {
        if (!existingSource) return;

        setIsDeleting(true);

        try {
            // Remove from workflow sources
            dispatch(workflowActions.removeSourceByBrokerId({ 
                id: workflowId,
                brokerId: existingSource.brokerId 
            }));

            // Remove from broker registry
            if (existingSource.sourceDetails) {
                dispatch(brokerActions.removeRegisterEntry({
                    source: existingSource.sourceDetails.source,
                    mappedItemId: existingSource.sourceDetails.mappedItemId,
                }));
            }

            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error("Failed to delete source:", error);
        } finally {
            setIsDeleting(false);
        }
    }, [existingSource, workflowId, dispatch, onOpenChange, onSuccess]);

    const handleCancel = useCallback(() => {
        onOpenChange(false);
    }, [onOpenChange]);

    const isFormValid = formData.fieldComponentId && formData.brokerId.trim();
    const hasChanges = !existingSource || !existingSource.sourceDetails || (
        formData.brokerId !== existingSource.brokerId ||
        formData.fieldComponentId !== existingSource.sourceDetails.mappedItemId ||
        formData.source !== existingSource.sourceDetails.source ||
        formData.sourceId !== existingSource.sourceDetails.sourceId
    );

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            {onBack && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onBack}
                                    className="p-1 h-auto"
                                    disabled={isSubmitting || isDeleting}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <DialogTitle>User Input Source</DialogTitle>
                        </div>
                        <DialogDescription>
                            Configure the user input source for this workflow.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Broker Selection */}
                        <BrokerSelect
                            value={formData.brokerId}
                            onValueChange={handleBrokerChange}
                            disabled={isSubmitting || isDeleting}
                        />

                        {/* Field Component */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Field Component</Label>
                            <Button
                                variant="outline"
                                onClick={() => setIsFieldSelectorOpen(true)}
                                className="w-full justify-start"
                                disabled={isSubmitting || isDeleting}
                            >
                                {fieldLabel || formData.fieldComponentId || "Browse Fields"}
                            </Button>
                        </div>

                        {/* Source (Scope) */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Source</Label>
                            <Select 
                                value={formData.source} 
                                onValueChange={handleSourceChange} 
                                disabled={isSubmitting || isDeleting}
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
                                disabled={isSubmitting || isDeleting}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2">
                        {existingSource && (
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={handleDelete} 
                                disabled={isSubmitting || isDeleting} 
                                className="mr-auto"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {isDeleting ? "Deleting..." : "Delete"}
                            </Button>
                        )}

                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleCancel} 
                            disabled={isSubmitting || isDeleting}
                        >
                            Cancel
                        </Button>

                        <Button 
                            size="sm" 
                            onClick={handleSubmit} 
                            disabled={!isFormValid || !hasChanges || isSubmitting || isDeleting}
                        >
                            {isSubmitting ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Field Selector Overlay */}
            <FieldListTableOverlay
                isOpen={isFieldSelectorOpen}
                onOpenChange={setIsFieldSelectorOpen}
                onFieldSelect={handleFieldSelect}
                onFieldCreated={handleFieldSelect}
                overlayTitle="Select Field Component"
                overlayDescription="Select a field component to map to the user input source."
                overlaySize="3xl"
                defaultPageSize={15}
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

export default UserInputSourceDialog; 