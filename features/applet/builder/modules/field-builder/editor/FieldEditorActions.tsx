"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
    ArrowLeft, 
    X, 
    Save, 
    Settings2, 
    Wrench 
} from "lucide-react";
import FieldSettingsOverlay from "../overlay-builder/FieldSettingsOverlay";


interface FieldEditorActionsProps {
    fieldId: string;
    isCreatingNew: boolean;
    isLoading: boolean;
    hasUnsavedChanges: boolean;
    showBackButton?: boolean;
    showCompileButton?: boolean;
    onSave: () => void;
    onCancel: () => void;
    onCompileAndAdd?: () => void;
}

const FieldEditorActions: React.FC<FieldEditorActionsProps> = ({
    fieldId,
    isCreatingNew,
    isLoading,
    hasUnsavedChanges,
    showBackButton = false,
    showCompileButton = false,
    onSave,
    onCancel,
    onCompileAndAdd,
}) => {
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    
    return (
        <>
            {showBackButton && (
                <Button
                    variant="outline"
                    onClick={onCancel}
                    className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                </Button>
            )}
            
            <Button
                variant="outline"
                onClick={() => setShowAdvancedSettings(true)}
                className="border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 px-3 py-1.5"
            >
                <Settings2 className="w-4 h-4 mr-1" />
                Advanced
            </Button>
            
            <Button
                variant="outline"
                onClick={onCancel}
                disabled={!hasUnsavedChanges}
                className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5"
            >
                <X className="w-4 h-4 mr-1" />
                Cancel
            </Button>
            
            <Button
                onClick={onSave}
                disabled={isLoading || !hasUnsavedChanges}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-3 py-1.5"
            >
                <Save className="w-4 h-4 mr-1" />
                {isLoading ? "Saving..." : isCreatingNew ? "Save" : "Update"}
            </Button>
            
            {showCompileButton && hasUnsavedChanges === false && (
                <Button
                    variant="outline"
                    onClick={onCompileAndAdd}
                    className="border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 px-3 py-1.5"
                >
                    <Wrench className="w-4 h-4 mr-1" />
                    Compile and Add
                </Button>
            )}
            
            <FieldSettingsOverlay
                isOpen={showAdvancedSettings}
                onClose={() => setShowAdvancedSettings(false)}
                fieldId={fieldId}
                onSave={onSave}
                onCancel={onCancel}
            />
        </>
    );
};

export default FieldEditorActions;