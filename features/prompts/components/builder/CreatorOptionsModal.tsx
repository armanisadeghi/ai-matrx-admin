"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
    selectShowCreatorDebug,
    selectShowSystemMessage,
    selectShowTemplateMessages,
} from "@/lib/redux/prompt-execution/selectors";
import {
    setCreatorDebug,
    setShowSystemMessage,
    setShowTemplateMessages,
} from "@/lib/redux/prompt-execution/slice";

interface CreatorOptionsModalProps {
    runId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function CreatorOptionsModal({
    runId,
    isOpen,
    onClose,
}: CreatorOptionsModalProps) {
    const dispatch = useAppDispatch();

    const showCreatorDebug = useAppSelector(state => selectShowCreatorDebug(state, runId));
    const showSystemMessage = useAppSelector(state => selectShowSystemMessage(state, runId));
    const showTemplateMessages = useAppSelector(state => selectShowTemplateMessages(state, runId));

    const handleDebugToggle = (checked: boolean) => {
        dispatch(setCreatorDebug({ runId, enabled: checked }));
        // If turning on debug, enable sub-options by default
        if (checked) {
            dispatch(setShowSystemMessage({ runId, show: true }));
            dispatch(setShowTemplateMessages({ runId, show: true }));
        } else {
            // If turning off debug, disable sub-options
            dispatch(setShowSystemMessage({ runId, show: false }));
            dispatch(setShowTemplateMessages({ runId, show: false }));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Creator Options</DialogTitle>
                    <DialogDescription>
                        Debug and control prompt execution visibility.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="creator-debug" className="flex flex-col space-y-1">
                            <span>Creator Debug Mode</span>
                            <span className="font-normal text-xs text-muted-foreground">
                                Enable advanced debugging controls
                            </span>
                        </Label>
                        <Switch
                            id="creator-debug"
                            checked={showCreatorDebug}
                            onCheckedChange={handleDebugToggle}
                        />
                    </div>

                    <div className="flex items-center justify-between space-x-2 pl-4 border-l-2 border-muted">
                        <Label htmlFor="show-system" className="flex flex-col space-y-1">
                            <span>Show System Message</span>
                            <span className="font-normal text-xs text-muted-foreground">
                                Display the system prompt in the chat
                            </span>
                        </Label>
                        <Switch
                            id="show-system"
                            checked={showSystemMessage}
                            onCheckedChange={(checked) =>
                                dispatch(setShowSystemMessage({ runId, show: checked }))
                            }
                            disabled={!showCreatorDebug}
                        />
                    </div>

                    <div className="flex items-center justify-between space-x-2 pl-4 border-l-2 border-muted">
                        <Label htmlFor="show-templates" className="flex flex-col space-y-1">
                            <span>Show Template Messages</span>
                            <span className="font-normal text-xs text-muted-foreground">
                                Show raw templates before first execution
                            </span>
                        </Label>
                        <Switch
                            id="show-templates"
                            checked={showTemplateMessages}
                            onCheckedChange={(checked) =>
                                dispatch(setShowTemplateMessages({ runId, show: checked }))
                            }
                            disabled={!showCreatorDebug}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
