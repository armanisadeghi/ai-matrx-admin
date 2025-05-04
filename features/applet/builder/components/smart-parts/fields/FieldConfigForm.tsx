"use client";

import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { PlusIcon, Settings2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldDefinition, ComponentType, ComponentProps } from "@/features/applet/builder/builder.types";
import { FieldConfigForms } from "../../field-config-forms/FieldConfigForms";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectFieldLoading } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { startFieldCreation, setActiveField } from "@/lib/redux/app-builder/slices/fieldBuilderSlice";
import { saveFieldThunk, saveFieldToContainerThunk } from "@/lib/redux/app-builder/thunks/fieldBuilderThunks";
import { useToast } from "@/components/ui/use-toast";

interface FieldConfigFormProps {
    containerId: string | null;
    onFieldAdded?: () => void;
}

const FieldConfigForm: React.FC<FieldConfigFormProps> = ({ containerId, onFieldAdded }) => {
    const dispatch = useAppDispatch();
    const { toast } = useToast();

    // Redux state
    const fieldLoading = useAppSelector(selectFieldLoading);

    // UI state
    const [showCustomConfigDialog, setShowCustomConfigDialog] = useState(false);
    const [newField, setNewField] = useState<Partial<FieldDefinition>>({
        id: uuidv4(),
        component: "input" as ComponentType,
        label: "",
        placeholder: "",
        componentProps: {},
    });

    const fieldTypes = [
        { value: "button", label: "Button" },
        { value: "select", label: "Dropdown" },
        { value: "input", label: "Text Input" },
        { value: "textarea", label: "Text Area" },
        { value: "number", label: "Number Input" },
        { value: "date", label: "Date Picker" },
        { value: "checkbox", label: "Checkbox Group" },
        { value: "radio", label: "Radio Group" },
        { value: "slider", label: "Slider" },
        { value: "multiselect", label: "Multi-Select" },
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewField((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleTypeChange = (value: string) => {
        setNewField((prev) => ({
            ...prev,
            component: value as ComponentType,
            componentProps: {}, // Reset custom config when type changes
        }));
    };

    const handleCustomConfigChange = (componentProps: ComponentProps) => {
        setNewField((prev) => ({
            ...prev,
            componentProps,
        }));
    };

    const handleAddField = async () => {
        if (newField.id && newField.label && newField.component && containerId) {
            try {
                // Create a new field in Redux state
                dispatch(
                    startFieldCreation({
                        id: newField.id,
                        label: newField.label,
                        placeholder: newField.placeholder || "",
                        component: newField.component,
                        componentProps: newField.componentProps || {},
                    })
                );

                // Save the field
                const savedField = await dispatch(saveFieldThunk(newField.id)).unwrap();

                // Add the field to the container
                await dispatch(
                    saveFieldToContainerThunk({
                        containerId: containerId,
                        fieldId: savedField.id,
                    })
                ).unwrap();

                toast({
                    title: "Field Added",
                    description: `Field "${newField.label}" has been added to the container.`,
                });

                // Reset form
                setNewField({
                    id: uuidv4(),
                    component: "input" as ComponentType,
                    label: "",
                    placeholder: "",
                    componentProps: {},
                });

                setShowCustomConfigDialog(false);

                // Notify parent component if callback provided
                if (onFieldAdded) {
                    onFieldAdded();
                }
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to add field. Please try again.",
                    variant: "destructive",
                });
                console.error("Error adding field:", error);
            }
        }
    };

    return (
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden h-full flex flex-col">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-200">Add New Field</CardTitle>
                <CardDescription>Create a new field for this group</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="space-y-6 h-full">
                    <div className="space-y-4">
                        <Label htmlFor="label" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            Field Label
                        </Label>
                        <Input
                            id="label"
                            name="label"
                            placeholder="e.g. First Name"
                            value={newField.label}
                            onChange={handleInputChange}
                            className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                        />
                    </div>

                    <div className="space-y-4">
                        <Label htmlFor="placeholder" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            Placeholder Text
                        </Label>
                        <Input
                            id="placeholder"
                            name="placeholder"
                            placeholder="e.g. Enter your first name"
                            value={newField.placeholder}
                            onChange={handleInputChange}
                            className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                        />
                    </div>

                    <div className="space-y-4">
                        <Label htmlFor="type" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            Field Type
                        </Label>
                        <Select value={newField.component} onValueChange={handleTypeChange}>
                            <SelectTrigger className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                                <SelectValue placeholder="Select field type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Field Types</SelectLabel>
                                    {fieldTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="pt-4 flex justify-between mt-auto">
                        <Dialog open={showCustomConfigDialog} onOpenChange={setShowCustomConfigDialog}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <Settings2 className="h-4 w-4 mr-2" />
                                    Advanced Settings
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>Field Configuration</DialogTitle>
                                    <DialogDescription>Configure advanced settings for this {newField.component} field.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <FieldConfigForms
                                        fieldType={newField.component || "input"}
                                        config={newField.componentProps || {}}
                                        onChange={handleCustomConfigChange}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button
                                        onClick={() => setShowCustomConfigDialog(false)}
                                        className="bg-rose-500 hover:bg-rose-600 text-white dark:bg-rose-600 dark:hover:bg-rose-700"
                                    >
                                        <Check className="h-4 w-4 mr-2" />
                                        Apply Settings
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Button
                            onClick={handleAddField}
                            disabled={!newField.label || !newField.component || fieldLoading || !containerId}
                            className="bg-rose-500 hover:bg-rose-600 text-white dark:bg-rose-600 dark:hover:bg-rose-700"
                        >
                            {fieldLoading ? (
                                "Adding..."
                            ) : (
                                <>
                                    <PlusIcon className="h-4 w-4 mr-2" />
                                    Add Field
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default FieldConfigForm;
