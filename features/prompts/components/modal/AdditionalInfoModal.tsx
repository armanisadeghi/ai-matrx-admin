"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Info, ArrowRight, SkipForward } from "lucide-react";

interface AdditionalInfoModalProps {
    isOpen: boolean;
    onContinue: (additionalInfo?: string) => void;
    onCancel: () => void;
    promptName: string;
}

/**
 * AdditionalInfoModal - Intermediary modal for hidden-variables mode
 * Allows user to optionally add additional instructions before running
 */
export function AdditionalInfoModal({
    isOpen,
    onContinue,
    onCancel,
    promptName
}: AdditionalInfoModalProps) {
    const [additionalInfo, setAdditionalInfo] = useState('');

    const handleContinue = () => {
        onContinue(additionalInfo.trim() || undefined);
        setAdditionalInfo(''); // Reset for next time
    };

    const handleSkip = () => {
        onContinue(undefined);
        setAdditionalInfo(''); // Reset for next time
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="max-w-[600px] p-0 gap-0">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                Additional Instructions
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Optionally provide additional context or instructions for <span className="font-medium">{promptName}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            Additional Information (Optional)
                        </Label>
                        <Textarea
                            value={additionalInfo}
                            onChange={(e) => setAdditionalInfo(e.target.value)}
                            placeholder="Add any extra context, requirements, or instructions..."
                            className="min-h-[120px] resize-none"
                            autoFocus
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-600">
                            This information will be included with your prompt execution
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        className="text-gray-600 dark:text-gray-400"
                    >
                        Cancel
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleSkip}
                            className="gap-2"
                        >
                            <SkipForward className="w-4 h-4" />
                            Skip
                        </Button>
                        <Button
                            onClick={handleContinue}
                            className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white gap-2"
                        >
                            Continue
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

