"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { PromptVariable } from "./PromptBuilder";

interface PromptSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    promptId?: string;
    promptName: string;
    promptDescription?: string;
    variableDefaults: PromptVariable[];
    onUpdate: (id: string, data: { name: string; description?: string; variableDefaults: PromptVariable[] }) => void;
    onLocalStateUpdate: (updates: { name?: string; description?: string; variableDefaults?: PromptVariable[] }) => void;
}

export function PromptSettingsModal({
    isOpen,
    onClose,
    promptId,
    promptName,
    promptDescription = "",
    variableDefaults,
    onUpdate,
    onLocalStateUpdate,
}: PromptSettingsModalProps) {
    const [localName, setLocalName] = useState(promptName);
    const [localDescription, setLocalDescription] = useState(promptDescription);
    const [localVariables, setLocalVariables] = useState<PromptVariable[]>([...variableDefaults]);
    const [isSaving, setIsSaving] = useState(false);

    // Reset local state when modal opens or props change
    useEffect(() => {
        if (isOpen) {
            setLocalName(promptName);
            setLocalDescription(promptDescription);
            setLocalVariables([...variableDefaults]);
        }
    }, [isOpen, promptName, promptDescription, variableDefaults]);

    const handleVariableDefaultChange = (index: number, value: string) => {
        const updated = [...localVariables];
        updated[index] = { ...updated[index], defaultValue: value };
        setLocalVariables(updated);
    };

    const handleSave = async () => {
        if (!promptId) return;

        setIsSaving(true);
        try {
            const updateData = {
                name: localName.trim(),
                description: localDescription.trim(),
                variableDefaults: localVariables,
            };

            // Update the database
            onUpdate(promptId, updateData);

            // Update local state in PromptBuilder
            onLocalStateUpdate(updateData);

            onClose();
        } catch (error) {
            console.error("Error saving prompt settings:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset to original values
        setLocalName(promptName);
        setLocalDescription(promptDescription);
        setLocalVariables([...variableDefaults]);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-900">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Prompt Settings
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Prompt Name */}
                    <div className="space-y-2">
                        <Label htmlFor="prompt-name" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Name
                        </Label>
                        <Input
                            id="prompt-name"
                            value={localName}
                            onChange={(e) => setLocalName(e.target.value)}
                            placeholder="Enter prompt name..."
                            className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                        />
                    </div>

                    {/* Prompt Description */}
                    <div className="space-y-2">
                        <Label htmlFor="prompt-description" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Description
                        </Label>
                        <Textarea
                            id="prompt-description"
                            value={localDescription}
                            onChange={(e) => setLocalDescription(e.target.value)}
                            placeholder="Describe what this prompt does..."
                            className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 min-h-[80px]"
                            rows={3}
                        />
                    </div>

                    {/* Variables Section */}
                    {localVariables.length > 0 && (
                        <div className="space-y-4">
                            <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Variable Default Values
                            </Label>
                            
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                                {localVariables.map((variable, index) => (
                                    <Card key={index} className="p-4 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {variable.name}
                                            </Label>
                                            <Textarea
                                                value={variable.defaultValue}
                                                onChange={(e) => handleVariableDefaultChange(index, e.target.value)}
                                                placeholder={`Default value for {{${variable.name}}}...`}
                                                className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 min-h-[60px]"
                                                rows={2}
                                            />
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !promptId}
                        className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                        {isSaving ? "Saving..." : "Save Settings"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
