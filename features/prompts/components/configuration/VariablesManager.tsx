import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { VariableEditorModal } from "./VariableEditorModal";
import { VariableCustomComponent } from "../../types/variable-components";

// Extended variable type with optional custom component
export interface ExtendedPromptVariable {
    name: string;
    defaultValue: string;
    customComponent?: VariableCustomComponent;
}

interface VariablesManagerProps {
    variableDefaults: ExtendedPromptVariable[];
    onAddVariable: (name: string, defaultValue: string, customComponent?: VariableCustomComponent) => void;
    onUpdateVariable: (oldName: string, defaultValue: string, customComponent?: VariableCustomComponent) => void;
    onRemoveVariable: (variableName: string) => void;
}

export function VariablesManager({
    variableDefaults,
    onAddVariable,
    onUpdateVariable,
    onRemoveVariable,
}: VariablesManagerProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [editingVariable, setEditingVariable] = useState<ExtendedPromptVariable | undefined>(undefined);

    const handleAddClick = () => {
        setModalMode('add');
        setEditingVariable(undefined);
        setIsModalOpen(true);
    };

    const handleEditClick = (variable: ExtendedPromptVariable) => {
        setModalMode('edit');
        setEditingVariable(variable);
        setIsModalOpen(true);
    };

    const handleSave = (name: string, defaultValue: string, customComponent?: VariableCustomComponent) => {
        if (modalMode === 'add') {
            onAddVariable(name, defaultValue, customComponent);
        } else if (editingVariable) {
            onUpdateVariable(editingVariable.name, defaultValue, customComponent);
        }
        setIsModalOpen(false);
    };

    const existingNames = variableDefaults.map(v => v.name);

    return (
        <>
            <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-xs text-gray-600 dark:text-gray-400">Variables</Label>
                {variableDefaults.map((variable) => (
                    <div
                        key={variable.name}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium border border-gray-200 dark:border-gray-700 group"
                    >
                        <span 
                            className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            onClick={() => handleEditClick(variable)}
                            title="Click to edit"
                        >
                            {variable.name}
                        </span>
                        <button
                            onClick={() => onRemoveVariable(variable.name)}
                            title="Remove variable"
                        >
                            <X className="w-3 h-3 hover:text-red-500 dark:hover:text-red-400" />
                        </button>
                    </div>
                ))}
                <button
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                    onClick={handleAddClick}
                >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                </button>
            </div>

            <VariableEditorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                existingVariable={editingVariable}
                existingNames={existingNames}
                mode={modalMode}
            />
        </>
    );
}

