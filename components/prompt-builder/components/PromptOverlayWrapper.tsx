"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import PromptEditor from "./PromptEditor";
import { PromptMessage } from "@/features/prompts/types/core";

interface PromptOverlayWrapperProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: {
        name: string;
        messages: PromptMessage[];
        variables: string[];
        variableDefaults: Record<string, string>;
    }) => void;
    initialMessages?: PromptMessage[];
    currentPrompt?: any;
    isDirty?: boolean;
}

const PromptOverlayWrapper = ({
    isOpen,
    onClose,
    onSave,
    initialMessages = [],
    currentPrompt = null,
    isDirty = false,
}: PromptOverlayWrapperProps) => {
    const handleSave = (data: {
        name: string;
        messages: PromptMessage[];
        variables: string[];
        variableDefaults: Record<string, string>;
    }) => {
        onSave(data);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-none w-full h-full p-0 flex flex-col">
                <VisuallyHidden>
                    <DialogTitle>Prompt Editor</DialogTitle>
                </VisuallyHidden>
                <div className="flex-1 min-h-0">
                    <PromptEditor
                        onSave={handleSave}
                        onClose={onClose}
                        initialMessages={initialMessages}
                        currentPrompt={currentPrompt}
                        isDirty={isDirty}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PromptOverlayWrapper; 