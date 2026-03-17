"use client";

import React, { useState } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import type { BlockPrinter } from "@/features/chat/utils/block-print-utils";

interface PrintOptionsDialogProps {
    printer: BlockPrinter;
    data: unknown;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function PrintOptionsContent({
    printer,
    data,
    onClose,
}: {
    printer: BlockPrinter;
    data: unknown;
    onClose: () => void;
}) {
    const [selectedVariant, setSelectedVariant] = useState<string>(
        printer.variants[0]?.id ?? ""
    );
    const [isPrinting, setIsPrinting] = useState(false);

    const handlePrint = async (variantId?: string) => {
        setIsPrinting(true);
        try {
            await printer.print(data, variantId);
        } finally {
            setIsPrinting(false);
            onClose();
        }
    };

    return (
        <div className="space-y-4 py-2">
            {printer.variants.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Print format</p>
                    <div className="space-y-1.5">
                        {printer.variants.map((variant) => (
                            <button
                                key={variant.id}
                                onClick={() => setSelectedVariant(variant.id)}
                                className={`w-full flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-colors ${
                                    selectedVariant === variant.id
                                        ? "border-primary bg-primary/5 text-primary"
                                        : "border-border bg-background hover:bg-accent"
                                }`}
                            >
                                <span className="text-sm font-medium">{variant.label}</span>
                                {variant.description && (
                                    <span className="text-xs text-muted-foreground mt-0.5">
                                        {variant.description}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
                <Button
                    onClick={() => handlePrint(selectedVariant || undefined)}
                    disabled={isPrinting}
                    className="w-full"
                >
                    <Printer className="w-4 h-4 mr-2" />
                    {isPrinting ? "Opening print view..." : "Print / Save PDF"}
                </Button>
                {printer.variants.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePrint(undefined)}
                        disabled={isPrinting}
                        className="w-full text-muted-foreground text-xs"
                    >
                        Print with defaults
                    </Button>
                )}
            </div>
        </div>
    );
}

/**
 * Shared pre-print options UI — shown when a BlockPrinter has variants.
 * Desktop: Dialog. Mobile: Drawer (bottom sheet).
 * If the printer has no variants, call printer.print() directly without showing this.
 */
export function PrintOptionsDialog({ printer, data, open, onOpenChange }: PrintOptionsDialogProps) {
    const isMobile = useIsMobile();

    const handleClose = () => onOpenChange(false);

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent>
                    <DrawerHeader className="flex items-center justify-between pb-2">
                        <DrawerTitle className="flex items-center gap-2">
                            <Printer className="w-4 h-4" />
                            {printer.label}
                        </DrawerTitle>
                        <Button variant="ghost" size="icon" onClick={handleClose} className="h-7 w-7">
                            <X className="w-4 h-4" />
                        </Button>
                    </DrawerHeader>
                    <div className="px-4 pb-2">
                        <PrintOptionsContent printer={printer} data={data} onClose={handleClose} />
                    </div>
                    <DrawerFooter />
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Printer className="w-4 h-4" />
                        {printer.label}
                    </DialogTitle>
                </DialogHeader>
                <PrintOptionsContent printer={printer} data={data} onClose={handleClose} />
                <DialogFooter />
            </DialogContent>
        </Dialog>
    );
}

/**
 * Hook that manages the state for PrintOptionsDialog.
 * Handles the logic: show dialog if variants exist, otherwise print immediately.
 */
export function usePrintOptions(printer: BlockPrinter | null, data: unknown) {
    const [open, setOpen] = useState(false);

    const triggerPrint = async () => {
        if (!printer) return;
        if (printer.variants.length === 0) {
            // No options — print immediately
            await printer.print(data);
        } else {
            setOpen(true);
        }
    };

    return { open, setOpen, triggerPrint };
}
