"use client";

import React from "react";
import UserInputSourceDialog from "./UserInputSourceDialog";

interface SourceInputNodeSettingsProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    workflowId: string;
    brokerId?: string; // New simplified prop
    // Legacy props for backwards compatibility
    currentMapping?: {
        brokerId: string;
        mappedItemId: string;
        source: string;
        sourceId: string;
    };
    mode?: "create" | "edit"; // Ignored now, but kept for backwards compatibility
    onSuccess?: () => void;
    onBack?: () => void;
}

const UserInputNodeSettings: React.FC<SourceInputNodeSettingsProps> = ({
    isOpen,
    onOpenChange,
    workflowId,
    brokerId,
    currentMapping,
    mode, // Ignored
    onSuccess,
    onBack,
}) => {
    // Use the direct brokerId prop if provided, otherwise fall back to currentMapping for backwards compatibility
    const effectiveBrokerId = brokerId || currentMapping?.brokerId;

    return (
        <UserInputSourceDialog
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            workflowId={workflowId}
            brokerId={effectiveBrokerId}
            onSuccess={onSuccess}
            onBack={onBack}
        />
    );
};

export default UserInputNodeSettings;
