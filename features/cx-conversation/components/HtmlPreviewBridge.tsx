"use client";

import React from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/slices/userSlice";
import { useHtmlPreviewState } from "@/features/html-pages/hooks/useHtmlPreviewState";
import HtmlPreviewFullScreenEditor from "@/features/html-pages/components/HtmlPreviewFullScreenEditor";

interface HtmlPreviewBridgeProps {
    content: string;
    messageId: string;
    onClose: () => void;
}

export function HtmlPreviewBridge({
    content,
    messageId,
    onClose,
}: HtmlPreviewBridgeProps) {
    const user = useAppSelector(selectUser);
    const htmlPreviewState = useHtmlPreviewState({
        markdownContent: content,
        user,
        isOpen: true,
    });

    return (
        <HtmlPreviewFullScreenEditor
            isOpen={true}
            onClose={onClose}
            htmlPreviewState={htmlPreviewState}
            title="HTML Preview & Publishing"
            description="Edit markdown, preview HTML, and publish your content"
            messageId={messageId}
        />
    );
}
