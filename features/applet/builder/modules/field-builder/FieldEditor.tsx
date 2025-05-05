"use client";

import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { ComponentType } from "../../builder.types";
import FieldRenderer from "./FieldRenderer";
import SmartFieldBuilder from "./SmartFieldBuilder";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import SectionCard from "../../../../../components/official/cards/SectionCard";
import {
    selectFieldById,
    selectFieldError,
    selectFieldLoading,
    selectFieldComponent,
} from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { startFieldCreation, setActiveField } from "@/lib/redux/app-builder/slices/fieldBuilderSlice";
import { saveFieldThunk } from "@/lib/redux/app-builder/thunks/fieldBuilderThunks";
import { addFieldThunk } from "@/lib/redux/app-builder/thunks/containerBuilderThunks";

interface FieldEditorProps {
    fieldId?: string;
    isCreatingNew?: boolean;
    onSaveSuccess?: (fieldId: string) => void;
    onCancel?: () => void;
    containerId?: string;
}

const FieldEditor: React.FC<FieldEditorProps> = ({ fieldId, isCreatingNew = false, onSaveSuccess, onCancel, containerId }) => {
    const dispatch = useAppDispatch();
    const { toast } = useToast();

    // Generate a new ID for new fields
    const [localFieldId, setLocalFieldId] = useState<string>(fieldId || uuidv4());

    // Get field data and state from Redux
    const field = useAppSelector((state) => selectFieldById(state, localFieldId));
    const isLoading = useAppSelector(selectFieldLoading);
    const error = useAppSelector(selectFieldError);
    const component = useAppSelector((state) => selectFieldComponent(state, localFieldId));

    // Preview state for component type selection (kept as local state)
    const [selectedComponentType, setSelectedComponentType] = useState<ComponentType | null>("textarea");

    // Initialize field in Redux if creating new
    useEffect(() => {
        if (isCreatingNew && !field) {
            dispatch(startFieldCreation({ id: localFieldId }));
        }

        // Set active field
        if (localFieldId) {
            dispatch(setActiveField(localFieldId));
        }

        return () => {
            // Clear active field when unmounting
            dispatch(setActiveField(null));
        };
    }, [dispatch, isCreatingNew, field, localFieldId]);

    // All available component types for the multi-component view
    const componentTypes: ComponentType[] = [
        "input",
        "textarea",
        "select",
        "multiselect",
        "radio",
        "checkbox",
        "slider",
        "number",
        "date",
        "switch",
        "button",
        "rangeSlider",
        "numberPicker",
        "jsonField",
        "fileUpload",
    ];

    // Save the current component
    const handleSave = async () => {
        if (!localFieldId) return;

        try {
            const savedComponent = await dispatch(saveFieldThunk(localFieldId)).unwrap();

            toast({
                title: "Success",
                description: `Field component ${isCreatingNew ? "created" : "updated"} successfully`,
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

    // Compile and add to container
    const handleCompileAndAdd = () => {
        handleSave();
        if (containerId) {
            addFieldThunk({ containerId, field: field });
        }
    };

    // Cancel editing
    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        }
    };

    if (!field && !isCreatingNew) {
        return <div className="p-4 text-gray-500 dark:text-gray-400">Loading field data...</div>;
    }

    return (
        <div className="w-full">
            {error && <div className="p-3 mb-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">{error}</div>}

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left side: Field Builder */}
                <div className="w-full lg:w-1/2">
                    <SectionCard
                        title={isCreatingNew ? "Create New Component" : "Edit Component"}
                        description="Configure all aspects of this field component."
                        footer={
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                    className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={isLoading}
                                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
                                >
                                    {isLoading ? "Saving..." : isCreatingNew ? "Create Component" : "Update Component"}
                                </Button>
                                {containerId && (
                                    <Button
                                        variant="outline"
                                        onClick={handleCompileAndAdd}
                                        className="border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                                    >
                                        Compile and Add to Container
                                    </Button>
                                )}
                            </>
                        }
                    >
                        <SmartFieldBuilder fieldId={localFieldId} />
                    </SectionCard>
                </div>

                {/* Right side: Preview area */}
                <div className="w-full lg:w-1/2">
                    <SectionCard title="Component Preview" description="Live preview of your field component">
                        {/* Current component preview */}
                        <div className="mt-6 mb-8 border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900 shadow-sm rounded-xl min-h-[250px]">
                            <h3 className="text-md font-semibold mb-6 capitalize text-gray-900 dark:text-gray-100">
                                Your New{" "}
                                <span className="text-blue-600 dark:text-blue-500 font-bold">
                                    {" "}
                                    {"  "}
                                    {component} {"  "}
                                </span>{" "}
                                Component
                            </h3>
                            {field && <FieldRenderer field={field} />}
                        </div>

                        {/* Component type selector */}
                        <div className="mb-8 space-y-3">
                            <Label className="text-gray-900 dark:text-gray-100">View As Different Component Type</Label>
                            <div className="flex flex-wrap gap-2">
                                {componentTypes.map((type) => (
                                    <Button
                                        key={type}
                                        variant={selectedComponentType === type ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedComponentType(type)}
                                        className={
                                            selectedComponentType === type
                                                ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
                                                : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                        }
                                    >
                                        {type.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                                    </Button>
                                ))}
                            </div>

                            {selectedComponentType && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedComponentType(null)}
                                    className="mt-2 border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    Clear Type Selection
                                </Button>
                            )}
                        </div>

                        {/* Additional component view when a type is selected */}
                        {field && selectedComponentType && (
                            <div className="border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900 shadow-sm rounded-xl min-h-[250px]">
                                <h3 className="text-md font-semibold mb-4 capitalize text-gray-900 dark:text-gray-100">
                                    Rendered as{"  "}
                                    <span className="text-blue-600 dark:text-blue-500 font-bold">
                                        {selectedComponentType.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                                    </span>
                                </h3>
                                <FieldRenderer
                                    field={{
                                        ...field,
                                        component: selectedComponentType,
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
