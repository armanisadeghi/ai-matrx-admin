"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const SNAP_POINTS = [0.6, 1] as const;

interface BottomSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

function BottomSheet({ open, onOpenChange, children }: BottomSheetProps) {
    const [snap, setSnap] = React.useState<number | string | null>(SNAP_POINTS[0]);

    React.useEffect(() => {
        if (!open) setSnap(SNAP_POINTS[0]);
    }, [open]);

    return (
        <DrawerPrimitive.Root
            open={open}
            onOpenChange={onOpenChange}
            snapPoints={SNAP_POINTS as unknown as (number | string)[]}
            activeSnapPoint={snap}
            setActiveSnapPoint={setSnap}
            modal={false}
        >
            <DrawerPrimitive.Portal>
                <DrawerPrimitive.Overlay className="fixed inset-0 z-50 mx-glass-scrim" />
                <DrawerPrimitive.Content
                    className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl mx-glass-drawer overflow-hidden"
                >
                    <div className="mx-auto mt-3 mb-1 h-1.5 w-10 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                    {children}
                </DrawerPrimitive.Content>
            </DrawerPrimitive.Portal>
        </DrawerPrimitive.Root>
    );
}

interface BottomSheetHeaderProps {
    title: string;
    showBack?: boolean;
    onBack?: () => void;
    trailing?: React.ReactNode;
}

function BottomSheetHeader({ title, showBack = false, onBack, trailing }: BottomSheetHeaderProps) {
    return (
        <div className="flex items-center px-2 pt-1 pb-2 flex-shrink-0 min-h-[44px]">
            <div className="min-w-[44px] flex items-center justify-start">
                <button
                    onClick={onBack}
                    className={cn(
                        "h-8 w-8 rounded-full mx-glass flex items-center justify-center transition-all active:scale-95",
                        showBack ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                    aria-hidden={!showBack}
                    tabIndex={showBack ? 0 : -1}
                >
                    <ChevronLeft className="h-4 w-4 text-foreground" />
                </button>
            </div>
            <span className="text-[17px] font-semibold flex-1 text-center truncate">
                {title}
            </span>
            <div className="min-w-[44px] flex items-center justify-end">
                {trailing}
            </div>
        </div>
    );
}

interface BottomSheetBodyProps {
    children: React.ReactNode;
    className?: string;
}

function BottomSheetBody({ children, className }: BottomSheetBodyProps) {
    return (
        <div
            className={cn("flex-1 overflow-y-auto overscroll-contain pb-safe", className)}
        >
            {children}
        </div>
    );
}

interface BottomSheetFooterProps {
    children: React.ReactNode;
    className?: string;
}

function BottomSheetFooter({ children, className }: BottomSheetFooterProps) {
    return (
        <div className={cn("flex-shrink-0 px-4 py-3 pb-safe border-t border-white/[0.06]", className)}>
            {children}
        </div>
    );
}

export { BottomSheet, BottomSheetHeader, BottomSheetBody, BottomSheetFooter };
export type { BottomSheetProps, BottomSheetHeaderProps, BottomSheetBodyProps, BottomSheetFooterProps };
