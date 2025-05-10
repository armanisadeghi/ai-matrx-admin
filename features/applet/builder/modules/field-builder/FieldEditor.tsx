"use client";

import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { Broker, ComponentType } from "../../../../../types/customAppTypes";
import FieldRenderer from "./FieldRenderer";
import SmartFieldBuilder from "./SmartFieldBuilder";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import SectionCard from "@/components/official/cards/SectionCard";
import {
    selectFieldById,
    selectFieldError,
    selectFieldLoading,
    selectFieldComponent,
    selectHasFieldUnsavedChanges,
} from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { startFieldCreation, setActiveField, setComponent, cancelFieldCreation } from "@/lib/redux/app-builder/slices/fieldBuilderSlice";
import { saveFieldThunk, fetchFieldByIdThunk } from "@/lib/redux/app-builder/thunks/fieldBuilderThunks";
import { addFieldAndCompileContainerThunk } from "@/lib/redux/app-builder/thunks/containerBuilderThunks";
import { recompileAppletThunk } from "@/lib/redux/app-builder/thunks/appletBuilderThunks";
import { componentOptions } from "@/features/applet/runner/field-components/FieldController";
import {ThemeSwitcherIcon} from "@/styles/themes";
import HelpIcon from "@/features/applet/runner/layouts/helpers/HelpIcon";
import { ArrowLeftIcon } from "@radix-ui/react-icons";


interface FieldEditorProps {
    fieldId?: string;
    isCreatingNew?: boolean;
    onSaveSuccess?: (fieldId: string) => void;
    onCancel?: () => void;
    containerId?: string;
    appletId?: string;
    broker?: Broker;
    showBackButton?: boolean;
}

const FieldEditor: React.FC<FieldEditorProps> = ({ fieldId, isCreatingNew = false, onSaveSuccess, onCancel, containerId, appletId, broker, showBackButton = false }) => {
    const dispatch = useAppDispatch();
    const { toast } = useToast();

    const isLoading = useAppSelector(selectFieldLoading);
    const error = useAppSelector(selectFieldError);

    // Generate a new ID for new fields
    const [localFieldId, setLocalFieldId] = useState<string>(fieldId || null);

    // Get field data and state from Redux
    const field = useAppSelector((state) => selectFieldById(state, localFieldId));
    const componentType = useAppSelector((state) => selectFieldComponent(state, localFieldId));
    const hasUnsavedChanges = useAppSelector((state) => selectHasFieldUnsavedChanges(state, localFieldId));

    const [viewAsComponentType, setViewAsComponentType] = useState<ComponentType | null>("textarea");

    useEffect(() => {
        if (fieldId) {
            dispatch(setActiveField(fieldId));
        }
    }, [dispatch, fieldId]);

    useEffect(() => {
        if (isCreatingNew) {
            dispatch(cancelFieldCreation(localFieldId));
            const newFieldId = uuidv4();
            setLocalFieldId(newFieldId);
            dispatch(startFieldCreation({ id: newFieldId }));
        } else {
            dispatch(setActiveField(fieldId));
        }
        
    }, [dispatch, isCreatingNew]);

    const handleComponentTypeChange = (componentType: ComponentType) => {
        setViewAsComponentType(componentType);
    };

    const handleSave = async () => {
        if (!localFieldId) return;

        try {
            const savedComponent = await dispatch(saveFieldThunk(localFieldId)).unwrap();

            toast({
                title: "Success",
                description: `Field component ${isCreatingNew ? "created" : "updated"}`,
            });

            if (onSaveSuccess) {
                onSaveSuccess(savedComponent.id);
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message || `Failed to ${isCreatingNew ? "create" : "update"} component`,
                variant: "destructive",
            });
            console.error("Error saving component:", err);
        }
    };

    const handleCompileAndAdd = async () => {
        await handleSave();

        // Only proceed if we have a container ID and a valid field
        if (containerId && field) {
            try {
                // Use the appropriate container thunk to add the field
                await dispatch(
                    addFieldAndCompileContainerThunk({
                        containerId: containerId,
                        field: field,
                    })
                ).unwrap();

                // Recompile the applet if we have an active applet ID
                if (appletId) {
                    await dispatch(recompileAppletThunk(appletId)).unwrap();
                }

                toast({
                    title: "Success",
                    description: `Field compiled and added to container successfully${appletId ? ", applet recompiled" : ""}`,
                });
            } catch (err: any) {
                toast({
                    title: "Error",
                    description: err.message || "Failed to compile and add field",
                    variant: "destructive",
                });
            }
        }
    };

    const handleCancel = async () => {
        if (!isCreatingNew && localFieldId) {
            // Fetch the original field data to restore it
            try {
                await dispatch(fetchFieldByIdThunk(localFieldId)).unwrap();

                toast({
                    title: "Changes Discarded",
                    description: "Your changes have been discarded",
                });
            } catch (err: any) {
                toast({
                    title: "Error",
                    description: err.message || "Failed to restore original field data",
                    variant: "destructive",
                });
                console.error("Error restoring field:", err);
            }
        } else {
            setLocalFieldId(null);
            dispatch(cancelFieldCreation(localFieldId));
            // const newFieldId = uuidv4();
            // dispatch(startFieldCreation({ id: newFieldId }));
            // setLocalFieldId(newFieldId);
        }

        if (onCancel) {
            dispatch(cancelFieldCreation(localFieldId));
            onCancel();
        }
    };

    if (!field) {
        return <div className="p-4 text-gray-500 dark:text-gray-400">Loading field data...</div>;
    }

    return (
        <div className="w-full">
            {error && <div className="p-1 mb-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">{error}</div>}

            <div className="flex flex-col lg:flex-row gap-3">
                {/* Left side: Field Builder */}
                <div className="w-full lg:w-1/2">
                    <SectionCard
                        title={isCreatingNew ? "Create New Component" : "Edit Component"}
                        color="gray"
                        spacing="relaxed"
                        footer={
                            <>
                                {showBackButton && (
                                    <Button
                                        variant="outline"
                                        onClick={handleCancel}
                                        className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                    >
                                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={!hasUnsavedChanges}
                                    className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={isLoading || !hasUnsavedChanges}
                                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
                                >
                                    {isLoading ? "Saving..." : isCreatingNew ? "Save" : "Update"}
                                </Button>
                                {!hasUnsavedChanges && containerId && (
                                    <Button
                                        variant="outline"
                                        onClick={handleCompileAndAdd}
                                        className="border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                                    >
                                        Compile and Add to Container
                                    </Button>
                                )}
                            </>
                        }
                    >
                        <SmartFieldBuilder key={broker?.id} fieldId={localFieldId} broker={broker} />
                    </SectionCard>
                </div>

                {/* Right side: Preview area */}
                <div className="w-full">
                    <SectionCard title="Component Preview" color="gray" spacing="relaxed">
                        {/* Current component preview */}
                        <div className="mt-6 mb-8 border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900 shadow-sm rounded-xl min-h-[250px]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-md font-semibold capitalize text-gray-900 dark:text-gray-100">
                                    Your New{" "}
                                    <span className="text-blue-600 dark:text-blue-500 font-bold">
                                        {" "}
                                        {componentType} {"  "}
                                    </span>{" "}
                                    Component
                                </h3>
                                <ThemeSwitcherIcon />
                            </div>
                            {field && <FieldRenderer field={field} />}
                        </div>

                        {/* Component type selector */}
                        <div className="mb-8 space-y-3">
                            <Label className="text-gray-900 dark:text-gray-100">View As Different Component Type</Label>
                            <HelpIcon text={"Not all Fields will make sense for your specific settings, but we like to let you 'shop around' to find the best fit. notice that if you provide more values, your component can take on more forms, without breaking."} />
                            <div className="flex flex-wrap gap-2">
                                {componentOptions.map((option) => (
                                    <Button
                                        key={option.value}
                                        variant={viewAsComponentType === option.value ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleComponentTypeChange(option.value)}
                                        className={
                                            viewAsComponentType === option.value
                                                ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
                                                : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                        }
                                    >
                                        {option.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Additional component view when a type is selected */}
                        {field && viewAsComponentType && (
                            <div className="border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900 shadow-sm rounded-xl min-h-[250px]">
                                <h3 className="text-md font-semibold mb-4 capitalize text-gray-900 dark:text-gray-100">
                                    Rendered as{"  "}
                                    <span className="text-blue-600 dark:text-blue-500 font-bold">
                                        {componentOptions.find((option) => option.value === viewAsComponentType)?.label}
                                    </span>
                                </h3>
                                <FieldRenderer
                                    field={{
                                        ...field,
                                        component: viewAsComponentType,
                                    }}
                                />
                            </div>
                        )}
                    </SectionCard>
                </div>
            </div>
            <Toaster />
        </div>
    );
};

export default FieldEditor;
