"use client";

import React, { useState } from "react";
import FullScreenOverlay, { TabDefinition } from "@/components/official/FullScreenOverlay";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/selectors/userSelectors";
import { useHtmlPreviewState } from "./useHtmlPreviewState";
import {
    HtmlPreviewTab,
    HtmlCodeTab,
    WordPressCSSTab,
    CompleteHtmlTab,
    CustomCopyTab,
    EditHtmlTab,
    SavePageTab
} from "./tabs";

interface HtmlPreviewFullScreenExampleProps {
    isOpen: boolean;
    onClose: () => void;
    htmlContent: string;
    title?: string;
    description?: string;
}

/**
 * Example component showing how to use HTML Preview tabs in a FullScreenOverlay
 * This demonstrates the integration pattern for the tabs
 */
export default function HtmlPreviewFullScreenExample({
    isOpen,
    onClose,
    htmlContent,
    title = "HTML Preview",
    description = "Preview, edit, and save your HTML content"
}: HtmlPreviewFullScreenExampleProps) {
    const user = useAppSelector(selectUser);
    const [activeTab, setActiveTab] = useState<string>("preview");
    
    // Initialize the hook with all state management
    const htmlPreviewState = useHtmlPreviewState({
        htmlContent,
        user,
        isOpen
    });

    // Define tabs for the FullScreenOverlay
    const tabDefinitions: TabDefinition[] = [
        {
            id: "preview",
            label: "Preview",
            content: (
                <HtmlPreviewTab
                    htmlContent={htmlContent}
                    state={htmlPreviewState}
                    actions={htmlPreviewState}
                    user={user}
                />
            ),
            className: "p-4"
        },
        {
            id: "html",
            label: "HTML Code",
            content: (
                <HtmlCodeTab
                    htmlContent={htmlContent}
                    state={htmlPreviewState}
                    actions={htmlPreviewState}
                    user={user}
                />
            ),
            className: "p-4"
        },
        {
            id: "css",
            label: "WordPress CSS",
            content: (
                <WordPressCSSTab
                    htmlContent={htmlContent}
                    state={htmlPreviewState}
                    actions={htmlPreviewState}
                    user={user}
                />
            ),
            className: "p-4"
        },
        {
            id: "complete",
            label: "Complete HTML",
            content: (
                <CompleteHtmlTab
                    htmlContent={htmlContent}
                    state={htmlPreviewState}
                    actions={htmlPreviewState}
                    user={user}
                />
            ),
            className: "p-4"
        },
        {
            id: "custom",
            label: "Custom Copy",
            content: (
                <CustomCopyTab
                    htmlContent={htmlContent}
                    state={htmlPreviewState}
                    actions={htmlPreviewState}
                    user={user}
                />
            ),
            className: "p-4"
        },
        {
            id: "edit",
            label: "Edit HTML",
            content: (
                <EditHtmlTab
                    htmlContent={htmlContent}
                    state={htmlPreviewState}
                    actions={htmlPreviewState}
                    user={user}
                />
            ),
            className: "p-4"
        },
        {
            id: "save",
            label: "Save Page",
            content: (
                <SavePageTab
                    htmlContent={htmlContent}
                    state={htmlPreviewState}
                    actions={htmlPreviewState}
                    user={user}
                />
            ),
            className: "p-4"
        }
    ];

    return (
        <FullScreenOverlay
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            description={description}
            tabs={tabDefinitions}
            initialTab={activeTab}
            onTabChange={setActiveTab}
            showSaveButton={false}
            showCancelButton={true}
            onCancel={onClose}
        />
    );
}

