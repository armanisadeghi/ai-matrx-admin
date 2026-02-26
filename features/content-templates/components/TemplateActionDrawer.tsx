"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { ContentTemplateDB } from "@/features/content-templates/types/content-templates-db";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Drawer,
    DrawerContent,
    DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Pencil,
    Eye,
    Copy,
    Trash2,
    Globe,
    Lock,
} from "lucide-react";

interface TemplateActionDrawerProps {
    template: ContentTemplateDB | null;
    isOpen: boolean;
    onClose: () => void;
    canEdit: boolean;
    onEdit: (template: ContentTemplateDB) => void;
    onPreview: (template: ContentTemplateDB) => void;
    onDuplicate: (template: ContentTemplateDB) => void;
    onDelete: (template: ContentTemplateDB) => void;
}

const ROLE_COLORS: Record<string, string> = {
    system: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    user: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    assistant: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    tool: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
};

function TemplateActionContent({
    template,
    canEdit,
    onEdit,
    onPreview,
    onDuplicate,
    onDelete,
    onClose,
}: Omit<TemplateActionDrawerProps, "isOpen"> & { onClose: () => void }) {
    if (!template) return null;

    const handleAction = (fn: () => void) => {
        onClose();
        fn();
    };

    return (
        <div className="flex flex-col gap-3 p-4">
            {/* Template info */}
            <div className="flex items-start gap-2 pb-2 border-b border-border">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{template.label}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className={`inline-flex items-center px-1.5 py-0 text-[10px] font-medium rounded border ${ROLE_COLORS[template.role ?? "user"] ?? ROLE_COLORS.user}`}>
                            {template.role}
                        </span>
                        {template.is_public ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 dark:text-green-400">
                                <Globe className="w-2.5 h-2.5" />
                                Public
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                <Lock className="w-2.5 h-2.5" />
                                Private
                            </span>
                        )}
                    </div>
                    {template.content && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                            {template.content}
                        </p>
                    )}
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
                <Button
                    variant="ghost"
                    className="justify-start gap-3 h-10"
                    onClick={() => handleAction(() => onPreview(template))}
                >
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    View
                </Button>

                {canEdit && (
                    <Button
                        variant="ghost"
                        className="justify-start gap-3 h-10"
                        onClick={() => handleAction(() => onEdit(template))}
                    >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                        Edit
                    </Button>
                )}

                <Button
                    variant="ghost"
                    className="justify-start gap-3 h-10"
                    onClick={() => handleAction(() => onDuplicate(template))}
                >
                    <Copy className="w-4 h-4 text-muted-foreground" />
                    Duplicate
                </Button>

                {canEdit && (
                    <>
                        <div className="h-px bg-border" />
                        <Button
                            variant="ghost"
                            className="justify-start gap-3 h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleAction(() => onDelete(template))}
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}

export function TemplateActionDrawer({
    template,
    isOpen,
    onClose,
    canEdit,
    onEdit,
    onPreview,
    onDuplicate,
    onDelete,
}: TemplateActionDrawerProps) {
    const isMobile = useIsMobile();

    const contentProps = { template, canEdit, onEdit, onPreview, onDuplicate, onDelete, onClose };

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DrawerContent className="max-h-[85dvh]">
                    <DrawerTitle className="sr-only">Template Actions</DrawerTitle>
                    <div className="overflow-y-auto overscroll-contain pb-safe">
                        <TemplateActionContent {...contentProps} />
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="sr-only">Template Actions</DialogTitle>
                </DialogHeader>
                <TemplateActionContent {...contentProps} />
            </DialogContent>
        </Dialog>
    );
}
