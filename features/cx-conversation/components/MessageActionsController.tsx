"use client";

import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
    selectOpenOverlays,
    selectMessageActionInstance,
    messageActionsActions,
    type MessageActionOverlay,
} from "@/features/cx-conversation/redux/messageActionsSlice";
import { chatConversationsActions } from "@/features/cx-conversation/redux/slice";
import dynamic from "next/dynamic";

const QuickSaveModal = dynamic(
    () =>
        import("@/features/notes/components/QuickSaveModal").then((m) => ({
            default: m.QuickSaveModal,
        })),
    { ssr: false },
);

const EmailInputDialog = dynamic(
    () => import("@/components/dialogs/EmailInputDialog"),
    { ssr: false },
);

const AuthGateDialog = dynamic(
    () => import("@/components/dialogs/AuthGateDialog"),
    { ssr: false },
);

const FullScreenMarkdownEditor = dynamic(
    () =>
        import(
            "@/components/mardown-display/chat-markdown/FullScreenMarkdownEditor"
        ),
    { ssr: false },
);

const ContentHistoryViewer = dynamic(
    () =>
        import("@/features/cx-conversation/ContentHistoryViewer").then((m) => ({
            default: m.ContentHistoryViewer,
        })),
    { ssr: false },
);


const HtmlPreviewBridge = dynamic(
    () =>
        import("@/features/cx-conversation/components/HtmlPreviewBridge").then(
            (m) => ({ default: m.HtmlPreviewBridge }),
        ),
    { ssr: false },
);

const FeedbackDialog = dynamic(
    () => import("@/app/(ssr)/_components/FeedbackDialog"),
    { ssr: false },
);

const AnnouncementsViewer = dynamic(
    () =>
        import("@/components/layout/AnnouncementsViewer").then(
            (m) => ({ default: m.AnnouncementsViewer }),
        ),
    { ssr: false },
);

const VSCodePreferencesModal = dynamic(
    () =>
        import("@/components/user-preferences/VSCodePreferencesModal").then(
            (m) => ({ default: m.VSCodePreferencesModal }),
        ),
    { ssr: false },
);

function OverlayRenderer({ entry }: { entry: MessageActionOverlay }) {
    const dispatch = useAppDispatch();
    const instance = useAppSelector((state) =>
        selectMessageActionInstance(state, entry.instanceId),
    );

    if (!instance) return null;

    const close = () =>
        dispatch(
            messageActionsActions.closeOverlay({
                instanceId: entry.instanceId,
                overlay: entry.overlay,
            }),
        );

    switch (entry.overlay) {
        case "saveToNotes":
            return (
                <QuickSaveModal
                    open={true}
                    onOpenChange={(open) => {
                        if (!open) close();
                    }}
                    initialContent={instance.content}
                    defaultFolder="Scratch"
                    onSaved={close}
                />
            );

        case "emailDialog":
            return (
                <EmailInputDialog
                    isOpen={true}
                    onClose={close}
                    onSubmit={async (email) => {
                        const response = await fetch(
                            "/api/chat/email-response",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    email,
                                    content: instance.content,
                                    metadata: {
                                        ...instance.metadata,
                                        timestamp:
                                            new Date().toLocaleString(),
                                    },
                                }),
                            },
                        );
                        const data = (await response.json()) as {
                            success?: boolean;
                            msg?: string;
                        };
                        if (!data.success)
                            throw new Error(
                                data.msg || "Failed to send email",
                            );
                        close();
                    }}
                />
            );

        case "authGate":
            return (
                <AuthGateDialog
                    isOpen={true}
                    onClose={close}
                    featureName={
                        (entry.data?.featureName as string) ?? "this feature"
                    }
                    featureDescription={
                        entry.data?.featureDescription as string | undefined
                    }
                />
            );

        case "fullScreenEditor": {
            type TabId = "write" | "matrx_split" | "markdown" | "wysiwyg" | "preview";
            const editorTabs = (entry.data?.tabs as TabId[] | undefined) ?? [
                "write", "matrx_split", "markdown", "wysiwyg", "preview",
            ] satisfies TabId[];
            const editorInitialTab = (entry.data?.initialTab as TabId | undefined) ?? "matrx_split";
            return (
                <FullScreenMarkdownEditor
                    isOpen={true}
                    initialContent={instance.content}
                    onSave={(newContent: string) => {
                        if (instance.sessionId && instance.messageId) {
                            dispatch(
                                chatConversationsActions.updateMessage({
                                    sessionId: instance.sessionId,
                                    messageId: instance.messageId,
                                    updates: { content: newContent },
                                }),
                            );
                        }
                        close();
                    }}
                    onCancel={close}
                    tabs={editorTabs}
                    initialTab={editorInitialTab}
                    analysisData={(entry.data?.analysisData ?? instance.metadata) as Record<string, unknown> | undefined}
                    messageId={instance.messageId || undefined}
                />
            );
        }

        case "contentHistory":
            if (!instance.sessionId) return null;
            return (
                <ContentHistoryViewer
                    isOpen={true}
                    onClose={close}
                    sessionId={instance.sessionId}
                    messageId={instance.messageId}
                />
            );

        case "htmlPreview":
            return (
                <HtmlPreviewBridge
                    content={instance.content}
                    messageId={instance.messageId}
                    onClose={close}
                />
            );

        case "submitFeedback":
            return <FeedbackDialog onClose={close} />;

        case "announcements":
            return (
                <AnnouncementsViewer isOpen={true} onClose={close} />
            );

        case "userPreferences":
            return (
                <VSCodePreferencesModal
                    isOpen={true}
                    onClose={close}
                    initialTab={
                        (entry.data?.initialTab as string | undefined) as
                            | "display"
                            | "prompts"
                            | undefined
                    }
                />
            );

        default:
            return null;
    }
}

export const MessageActionsController: React.FC = () => {
    const [isMounted, setIsMounted] = useState(false);
    const openOverlays = useAppSelector(selectOpenOverlays);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted || openOverlays.length === 0) return null;

    return (
        <>
            {openOverlays.map((entry) => (
                <OverlayRenderer
                    key={`${entry.instanceId}-${entry.overlay}`}
                    entry={entry}
                />
            ))}
        </>
    );
};

export default MessageActionsController;
