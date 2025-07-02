"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, X, FormInput, Settings } from "lucide-react";
import FieldsWithFetch from "@/features/applet/runner/fields/core/FieldsWithFetch";
import SingleMappingForm from "./SingleMappingForm";
import { brokerActions } from "@/lib/redux/brokerSlice";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { workflowActions } from "@/lib/redux/workflow/slice";
import { workflowSelectors } from "@/lib/redux/workflow/selectors";
import { selectFieldLabelsByIds } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { useToast } from "@/components/ui/use-toast";
import { EntitySheetTwo } from "@/app/entities/fields/other-components/EntitySheetTwo";
import { BrokerSourceConfig } from "@/lib/redux/workflow/types";

interface FieldDisplaySheetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    workflowId: string;
    onSave: () => Promise<void>;
}

const FieldDisplaySheet: React.FC<FieldDisplaySheetProps> = ({ isOpen, onOpenChange, workflowId, onSave }) => {
    const dispatch = useAppDispatch();
    const { toast } = useToast();
    
    // Get user input sources specifically
    const userInputSources = useAppSelector((state) => workflowSelectors.userInputSources(state));
    const sourceFieldIds = useAppSelector((state) => workflowSelectors.sourceFieldIds(state));
    const isDirty = useAppSelector((state) => workflowSelectors.isDirty(state));

    // Get field labels for displaying alongside broker IDs
    const fieldLabels = useAppSelector((state) => selectFieldLabelsByIds(state, sourceFieldIds));

    // Determine default tab based on whether sources exist
    const defaultTab = useMemo(() => {
        return userInputSources.length > 0 ? "fields" : "mappings";
    }, [userInputSources.length]);

    const [activeTab, setActiveTab] = useState(defaultTab);
    const [showMappingForm, setShowMappingForm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Update active tab when sources change and we're currently on the default
    React.useEffect(() => {
        if (activeTab === defaultTab) {
            const newDefaultTab = userInputSources.length > 0 ? "fields" : "mappings";
            if (newDefaultTab !== activeTab) {
                setActiveTab(newDefaultTab);
            }
        }
    }, [userInputSources.length, activeTab, defaultTab]);

    const handleMappingCreated = useCallback(() => {
        setShowMappingForm(false);
        // Switch to fields tab after creating a mapping
        setActiveTab("fields");
        toast({
            title: "Mapping Created",
            description: "Field mapping created successfully.",
        });
    }, [toast]);

    const handleCancelMapping = useCallback(() => {
        setShowMappingForm(false);
    }, []);

    const handleRemoveMapping = useCallback(
        (brokerId: string) => {
            // Find the user input source to get the mapping details
            const sourceConfig = userInputSources.find((s) => s.brokerId === brokerId) as BrokerSourceConfig<"user_input"> | undefined;
            
            if (sourceConfig?.sourceDetails) {
                // Remove from broker registry using source and mappedItemId from sourceDetails
                dispatch(
                    brokerActions.removeRegisterEntry({
                        source: sourceConfig.sourceDetails.source,
                        mappedItemId: sourceConfig.sourceDetails.mappedItemId,
                    })
                );

                // Remove from workflow sources using proper structure
                dispatch(workflowActions.removeSource({ 
                    sourceType: "user_input", 
                    brokerId: brokerId 
                }));

                toast({
                    title: "Mapping Removed",
                    description: "Field mapping removed successfully.",
                });
            }
        },
        [dispatch, userInputSources, toast]
    );

    const handleShowMappingForm = useCallback(() => {
        setShowMappingForm(true);
    }, []);

    const handleSaveAndClose = useCallback(async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            await onSave();
            setSaveSuccess(true);
            toast({
                title: "Workflow Saved",
                description: "Field mappings have been saved successfully.",
            });
            // Brief delay to show success state before closing
            setTimeout(() => {
                onOpenChange(false);
            }, 500);
        } catch (error) {
            console.error("Failed to save workflow:", error);
            toast({
                title: "Save Failed",
                description: "Failed to save workflow. Please try again.",
                variant: "destructive",
            });
            // Don't close on error - let user try again
        } finally {
            setIsSaving(false);
        }
    }, [onSave, onOpenChange, toast]);

    const handleCancel = useCallback(() => {
        onOpenChange(false);
    }, [onOpenChange]);

    // Reset success state when sheet opens
    React.useEffect(() => {
        if (isOpen) {
            setSaveSuccess(false);
        }
    }, [isOpen]);

    // Footer content for EntitySheetTwo
    const footerContent = (
        <div className="flex gap-3 w-full">
            <Button variant="outline" onClick={handleCancel} className="flex-1" disabled={isSaving}>
                Cancel
            </Button>
            <Button onClick={handleSaveAndClose} disabled={!isDirty || isSaving || saveSuccess} className="flex-1">
                {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save Field Changes"}
            </Button>
        </div>
    );

    return (
        <EntitySheetTwo
            open={isOpen}
            onOpenChange={onOpenChange}
            position="left"
            size="xl"
            title={
                <div className="flex items-center gap-2">
                    <FormInput className="w-4 h-4" />
                    User Input Sources
                </div>
            }
            description="Manage field components for user input sources"
            footer={footerContent}
        >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="fields" className="flex items-center gap-2">
                        <FormInput className="w-4 h-4" />
                        Fields
                    </TabsTrigger>
                    <TabsTrigger value="mappings" className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Manage Mappings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="fields" className="flex-1 mt-0 overflow-y-auto pr-2">
                    {sourceFieldIds.length > 0 ? (
                        <div className="space-y-4 pb-8 pr-2">
                            <FieldsWithFetch
                                fieldIds={sourceFieldIds}
                                sourceId={workflowId}
                                source="workflow"
                                className="space-y-4"
                                wrapperClassName="mb-0"
                                showLabels={true}
                                showHelpText={true}
                                showRequired={true}
                                labelPosition="top"
                                separatorStyle="border"
                            />
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground pb-8 pr-2">
                            <FormInput className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium mb-2">No fields mapped yet</p>
                            <p className="text-sm mb-4">Create field mappings to start collecting input data</p>
                            <Button 
                                onClick={() => setActiveTab("mappings")} 
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                <Settings className="w-4 h-4" />
                                Go to Manage Mappings
                            </Button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="mappings" className="flex-1 mt-0 overflow-y-auto pr-2">
                    <div className="space-y-4 pb-8 pr-2">
                        {/* Header with Add Mapping Button */}
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Create and manage field mappings for your workflow.
                            </div>
                            {!showMappingForm && (
                                <Button onClick={handleShowMappingForm} variant="outline" size="sm" className="flex items-center gap-2">
                                    <Plus className="w-4 h-4" />
                                    Add Mapping
                                </Button>
                            )}
                        </div>

                        {/* Mapping Form */}
                        {showMappingForm && (
                            <SingleMappingForm
                                workflowId={workflowId}
                                onMappingCreated={handleMappingCreated}
                                onCancel={handleCancelMapping}
                            />
                        )}

                        {/* Existing Field Mappings */}
                        {userInputSources.length > 0 ? (
                            <div className="space-y-3">
                                <div className="text-sm font-medium text-foreground">Current Field Mappings</div>
                                {userInputSources.map((source) => {
                                    const typedSource = source as BrokerSourceConfig<"user_input">;
                                    const fieldLabel = fieldLabels[typedSource.sourceDetails.mappedItemId] || "Unknown Field";
                                    return (
                                        <div key={source.brokerId} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 dark:bg-muted/30">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-sm font-medium text-foreground">{source.brokerId}</div>
                                                <div className="text-xs text-muted-foreground">{fieldLabel}</div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveMapping(source.brokerId)}
                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : !showMappingForm && (
                            <div className="text-center py-12 text-muted-foreground">
                                <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium mb-2">No field mappings yet</p>
                                <p className="text-sm mb-4">Click "Add Mapping" to create your first field mapping</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </EntitySheetTwo>
    );
};

export default FieldDisplaySheet;
