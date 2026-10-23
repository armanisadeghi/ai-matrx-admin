"use client";

// Kept ONLY for features/audio/voice (FilterModal, VoiceSelectionModal), whose lane is closed to this
// change. It is no longer a twin of the design-system BottomSheet: it IS the BottomSheet, with the old
// prop names, the explicit close X the old wrapper drew, and its `maxHeight` honoured as a height cap.
// (`description` is gone: a sentence under a title is interface prose.) Delete it, and point those two
// files at BottomSheet, when the audio lane is free.

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { BottomSheet, BottomSheetBody, BottomSheetHeader, IconButton } from "@ai-matrx/design-system";

interface MobileOverlayWrapperProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    title?: string;
    className?: string;
    maxHeight?: "sm" | "md" | "lg" | "xl";
}

const MAX_HEIGHT_CLASS = {
    sm: "max-h-[50dvh]",
    md: "max-h-[65dvh]",
    lg: "max-h-[80dvh]",
    xl: "max-h-[90dvh]",
} as const;

export function MobileOverlayWrapper({ isOpen, onClose, children, title, className, maxHeight = "lg" }: MobileOverlayWrapperProps) {
    return (
        <BottomSheet
            open={isOpen}
            onOpenChange={(open) => !open && onClose()}
            title={title ?? "Options"}
            contentClassName={[MAX_HEIGHT_CLASS[maxHeight], className].filter(Boolean).join(" ")}
        >
            <BottomSheetHeader
                title={title ?? "Options"}
                trailing={<IconButton icon={X} variant="ghost" aria-label="Close" onClick={onClose} />}
            />
            <BottomSheetBody>{children}</BottomSheetBody>
        </BottomSheet>
    );
}
