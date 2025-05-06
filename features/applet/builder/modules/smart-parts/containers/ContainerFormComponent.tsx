"use client";

import React, { useState, useEffect } from "react";
import { SaveIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { 
    selectContainerById,
    selectContainerLoading,
} from "@/lib/redux/app-builder/selectors/containerSelectors";
import { 
    setLabel,
    setShortLabel,
    setDescription,
    setIsDirty,
} from "@/lib/redux/app-builder/slices/containerBuilderSlice";
import { saveContainerThunk } from "@/lib/redux/app-builder/thunks/containerBuilderThunks";

interface ContainerFormComponentProps {
    containerId: string | null;
    onSaveSuccess?: (containerId: string) => void;
    title?: string;
}

const ContainerFormComponent: React.FC<ContainerFormComponentProps> = ({
    containerId,
    onSaveSuccess,
    title = "Container Details",
}) => {
    const { toast } = useToast();
    const dispatch = useAppDispatch();
    
    // Local loading state for this component
    const [isSaving, setIsSaving] = useState(false);
    
    // Get container data and loading state from Redux
    const container = useAppSelector(state => 
        containerId ? selectContainerById(state, containerId) : null
    );
    const isLoading = useAppSelector(selectContainerLoading);
    
    // Check if the form is dirty (has unsaved changes)
    const isDirty = container?.isDirty || false;
    
    // Handle label change
    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!containerId) return;
        
        dispatch(
            setLabel({
                id: containerId,
                label: e.target.value,
            })
        );
        
        // Mark as dirty
        dispatch(
            setIsDirty({
                id: containerId,
                isDirty: true,
            })
        );
    };
    
    // Handle short label change
    const handleShortLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!containerId) return;
        
        dispatch(
            setShortLabel({
                id: containerId,
                shortLabel: e.target.value,
            })
        );
        
        // Mark as dirty
        dispatch(
            setIsDirty({
                id: containerId,
                isDirty: true,
            })
        );
    };
    
    // Handle description change
    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!containerId) return;
        
        dispatch(
            setDescription({
                id: containerId,
                description: e.target.value,
            })
        );
        
        // Mark as dirty
        dispatch(
            setIsDirty({
                id: containerId,
                isDirty: true,
            })
        );
    };
    
    // Handle save container
    const handleSaveContainer = async () => {
        if (!containerId) return;
        
        setIsSaving(true);
        
        try {
            const result = await dispatch(saveContainerThunk(containerId)).unwrap();
            
            toast({
                title: "Success",
                description: "Container saved successfully.",
            });
            
            // Call the success callback with the container ID
            if (onSaveSuccess) {
                onSaveSuccess(result.id);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: typeof error === "string" ? error : "Failed to save container.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    // Compute the validity state of the form
    const isValid = container?.label && container.label.trim() !== "";
    
    // Should the save button be enabled?
    const canSave = !isLoading && !isSaving && isDirty && isValid;
    
    if (!containerId) {
        return (
            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No container selected.
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-200">
                    {title} 
                    {isDirty && container?.label && <span className="text-xs text-red-500 ml-2">(unsaved changes)</span>}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="label" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            Container Label <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="label"
                            name="label"
                            placeholder="Enter a label for this container"
                            value={container?.label || ""}
                            onChange={handleLabelChange}
                            className="border-gray-300 dark:border-gray-700"
                            disabled={isLoading || isSaving}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label
                            htmlFor="shortLabel"
                            className="text-sm font-medium text-gray-800 dark:text-gray-200"
                        >
                            Short Label (Optional)
                        </Label>
                        <Input
                            id="shortLabel"
                            name="shortLabel"
                            placeholder="e.g. 'Personal' for 'Personal Information'"
                            value={container?.shortLabel || ""}
                            onChange={handleShortLabelChange}
                            className="border-gray-300 dark:border-gray-700"
                            disabled={isLoading || isSaving}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label
                            htmlFor="description"
                            className="text-sm font-medium text-gray-800 dark:text-gray-200"
                        >
                            Description (Optional)
                        </Label>
                        <Textarea
                            id="description"
                            name="description"
                            placeholder="Enter a description for this container"
                            value={container?.description || ""}
                            onChange={handleDescriptionChange}
                            className="border-gray-300 dark:border-gray-700 h-24 resize-none"
                            disabled={isLoading || isSaving}
                        />
                    </div>
                    
                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={handleSaveContainer}
                            disabled={!canSave}
                            variant="outline"
                            className="border-blue-500 text-blue-500"
                        >
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <SaveIcon className="mr-2 h-4 w-4" />
                            )}
                            Save Container
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ContainerFormComponent;
