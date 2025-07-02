"use client";

import React from "react";
import CreateUserInputSource from "./CreateUserInputSource";
import EditUserInputSource from "./EditUserInputSource";

interface SourceInputNodeSettingsProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    workflowId: string;
    currentMapping?: {
        brokerId: string;
        mappedItemId: string;
        source: string;
        sourceId: string;
    };
    mode?: "create" | "edit";
    onSuccess?: () => void;
    onBack?: () => void;
}

const UserInputNodeSettings: React.FC<SourceInputNodeSettingsProps> = ({
    isOpen,
    onOpenChange,
    workflowId,
    currentMapping,
    mode = "edit",
    onSuccess,
    onBack,
}) => {

    
    if (mode === "create") {
        return (
            <CreateUserInputSource
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                workflowId={workflowId}
                onSuccess={onSuccess}
                onBack={onBack}
            />
        );
    }

    if (mode === "edit" && currentMapping?.brokerId) {
        return (
            <EditUserInputSource
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                workflowId={workflowId}
                brokerId={currentMapping.brokerId}
                onSuccess={onSuccess}
            />
        );
    }

    // Invalid state - should not happen
    console.warn("SourceInputNodeSettings: Invalid mode or missing brokerId for edit mode");
    return null;
};

export default UserInputNodeSettings;
