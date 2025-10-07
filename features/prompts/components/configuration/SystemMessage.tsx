import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface SystemMessageProps {
    developerMessage: string;
    onDeveloperMessageChange: (value: string) => void;
    onDeveloperMessageClear: () => void;
}

export function SystemMessage({
    developerMessage,
    onDeveloperMessageChange,
    onDeveloperMessageClear,
}: SystemMessageProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-600 dark:text-gray-400">System</Label>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    onClick={onDeveloperMessageClear}
                >
                    Clear
                </Button>
            </div>
            <div className="relative">
                <textarea
                    value={developerMessage}
                    onChange={(e) => onDeveloperMessageChange(e.target.value)}
                    onFocus={(e) => {
                        // Set initial height on focus
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                    }}
                    placeholder="You're a very helpful assistant"
                    className="w-full min-h-[240px] bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg outline-none text-xs text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 p-3 resize-none overflow-hidden"
                />
            </div>
        </div>
    );
}

