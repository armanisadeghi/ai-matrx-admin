/**
 * INTEGRATION EXAMPLE: How to add Resources to PromptInput
 * 
 * This file shows how to integrate the resource system with PromptInput component.
 * Follow these steps to add resource management to your prompt input.
 */

import React, { useState, useRef, useCallback } from "react";
import { PromptInput } from "./PromptInput";
import { ResourcePickerButton } from "./resource-picker";
import { ResourceChips, type Resource } from "./resource-display";
import { useClipboardPaste } from "@/components/ui/file-upload/useClipboardPaste";
import { useFileUploadWithStorage } from "@/components/ui/file-upload/useFileUploadWithStorage";

export function PromptInputWithResources() {
    // State for managing resources
    const [resources, setResources] = useState<Resource[]>([]);
    const [chatInput, setChatInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // File upload hook for paste support
    const { uploadMultipleToPrivateUserAssets } = useFileUploadWithStorage(
        "userContent",
        "prompt-attachments"
    );

    // Handle resource selection from picker
    const handleResourceSelected = useCallback((resource: any) => {
        console.log("Resource selected:", resource);
        
        // Add to resources array
        setResources(prev => [...prev, resource]);
    }, []);

    // Handle resource removal
    const handleRemoveResource = useCallback((index: number) => {
        setResources(prev => prev.filter((_, i) => i !== index));
    }, []);

    // Handle pasted images
    const handlePasteImage = useCallback(async (file: File) => {
        try {
            const results = await uploadMultipleToPrivateUserAssets([file]);
            if (results && results.length > 0) {
                setResources(prev => [
                    ...prev,
                    { type: "file", data: results[0] }
                ]);
            }
        } catch (error) {
            console.error("Failed to upload pasted image:", error);
        }
    }, [uploadMultipleToPrivateUserAssets]);

    // Setup clipboard paste
    useClipboardPaste({
        textareaRef,
        onPasteImage: handlePasteImage,
        disabled: false
    });

    // Handle message submission
    const handleSendMessage = useCallback(() => {
        if (!chatInput.trim() && resources.length === 0) return;

        // Prepare message with resources
        const messageData = {
            content: chatInput,
            resources: resources,
            timestamp: new Date().toISOString()
        };

        console.log("Sending message:", messageData);

        // TODO: Send to your backend/API
        // - For files: URLs are already available
        // - For notes: Fetch full content if needed
        // - For tables: Use RPC with reference to get data
        // - For webpage: textContent is already available
        // - For tasks/projects: Data is already available

        // Clear after sending
        setChatInput("");
        setResources([]);
    }, [chatInput, resources]);

    return (
        <div className="w-full">
            {/* Main Input Container */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
                {/* Variables would go here if you're using PromptInput.tsx's variable system */}
                
                {/* Resource Chips Display - Inside the input container */}
                {resources.length > 0 && (
                    <div className="border-b border-gray-200 dark:border-gray-800 py-1.5">
                        <ResourceChips
                            resources={resources}
                            onRemove={handleRemoveResource}
                            onPreview={(resource, index) => {
                                console.log("Preview resource:", resource, "at index:", index);
                                // TODO: Implement full preview sheet
                                // Similar to FilePreviewSheet but handles all resource types
                            }}
                        />
                    </div>
                )}

                {/* Text Area */}
                <div className="px-0.5 pt-1.5">
                    <textarea
                        ref={textareaRef}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type your message... (Paste images with Ctrl+V)"
                        className="w-full bg-transparent border-none outline-none text-xs text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none overflow-y-auto"
                        style={{ minHeight: '40px', maxHeight: '200px' }}
                        rows={1}
                    />
                </div>

                {/* Bottom Controls */}
                <div className="flex items-center justify-between px-2 pb-1.5">
                    <div className="flex items-center gap-1">
                        {/* Resource Picker Button */}
                        <ResourcePickerButton
                            onResourceSelected={handleResourceSelected}
                        />
                    </div>

                    <div className="flex items-center gap-1">
                        {/* Send button */}
                        <button
                            onClick={handleSendMessage}
                            disabled={!chatInput.trim() && resources.length === 0}
                            className="h-7 w-7 p-0 flex-shrink-0 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 text-white flex items-center justify-center transition-colors"
                        >
                            <span className="text-sm">↑</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Debug Info (remove in production) */}
            <div className="mt-4 p-4 bg-gray-100 dark:bg-zinc-800 rounded text-xs">
                <div className="font-semibold mb-2">Resources ({resources.length})</div>
                <pre className="overflow-auto">
                    {JSON.stringify(resources, null, 2)}
                </pre>
            </div>
        </div>
    );
}

/**
 * INTEGRATION CHECKLIST:
 * 
 * ✅ 1. Add ResourceChips display area above textarea
 * ✅ 2. Setup clipboard paste handling
 * ✅ 3. Add ResourcePickerButton to bottom controls
 * ✅ 4. Manage resources state array
 * ✅ 5. Handle resource removal
 * ✅ 6. Include resources in message submission
 * 
 * TODO:
 * 
 * 1. Create ResourcePreviewSheet component (like FilePreviewSheet)
 *    - Handle different resource types
 *    - Show note content
 *    - Show task/project details  
 *    - Show table data preview
 *    - Show webpage content
 *    - Show file previews (existing)
 * 
 * 2. Fetch actual data when needed:
 *    - Notes: Already have content
 *    - Tasks/Projects: Already have data
 *    - Files: Have URLs
 *    - Tables: Call RPC with reference
 *    - Webpage: Have textContent
 * 
 * 3. Add YouTube video support (coming next)
 * 
 * 4. Optional: Add drag-and-drop for file uploads
 * 
 * 5. Optional: Add resource count badge on picker button
 */

