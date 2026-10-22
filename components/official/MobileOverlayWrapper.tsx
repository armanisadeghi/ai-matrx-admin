"use client";

// Kept ONLY for features/audio/voice (FilterModal, VoiceSelectionModal), whose lane is closed to this
// change. It is no longer a twin of the design-system BottomSheet: it IS the BottomSheet, with the old
// prop names. Delete it, and point those two files at BottomSheet, when the audio lane is free.

import type { ReactNode } from "react";
import { BottomSheet, BottomSheetBody, BottomSheetHeader } from "@ai-matrx/design-system";

interface MobileOverlayWrapperProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    title?: string;
    description?: string;
    className?: string;
    maxHeight?: "sm" | "md" | "lg" | "xl";
}

export function MobileOverlayWrapper({ isOpen, onClose, children, title, className }: MobileOverlayWrapperProps) {
    return (
        <BottomSheet
            open={isOpen}
            onOpenChange={(open) => !open && onClose()}
            title={title ?? "Options"}
            {...(className ? { contentClassName: className } : {})}
        >
            {title ? <BottomSheetHeader title={title} /> : null}
            <BottomSheetBody>{children}</BottomSheetBody>
        </BottomSheet>
    );
}
