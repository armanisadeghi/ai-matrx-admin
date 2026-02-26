"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
    ContentTemplateDB,
    CreateContentTemplateInput,
    UpdateContentTemplateInput,
    MessageRole,
} from "@/features/content-templates/types/content-templates-db";
import {
    createTemplate,
    updateTemplate,
    clearTemplateCache,
} from "@/features/content-templates/services/content-templates-service";
import { PageSpecificHeader } from "@/components/layout/new-layout/PageSpecificHeader";
import { FileText } from "lucide-react";

const MESSAGE_ROLES: { value: MessageRole; label: string }[] = [
    { value: "system", label: "System" },
    { value: "user", label: "User" },
    { value: "assistant", label: "Assistant" },
    { value: "tool", label: "Tool" },
];

interface TemplateEditorProps {
    template?: ContentTemplateDB | null;
    mode: "create" | "edit";
}

function EditorHeader({ mode, isSaving, canSave, onBack, onSave }: {
    mode: "create" | "edit";
    isSaving: boolean;
    canSave: boolean;
    onBack: () => void;
    onSave: () => void;
}) {
    return (
        <PageSpecificHeader>
            <div className="flex items-center gap-2 w-full px-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={onBack}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-semibold truncate">
                        {mode === "create" ? "New Template" : "Edit Template"}
                    </span>
                </div>
                <Button
                    size="sm"
                    onClick={onSave}
                    disabled={isSaving || !canSave}
                    className="flex-shrink-0 h-7 px-3 text-xs"
                >
                    {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <>
                            <Save className="h-3.5 w-3.5 mr-1" />
                            Save
                        </>
                    )}
                </Button>
            </div>
        </PageSpecificHeader>
    );
}

export function TemplateEditor({ template, mode }: TemplateEditorProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const [label, setLabel] = useState(template?.label ?? "");
    const [content, setContent] = useState(template?.content ?? "");
    const [role, setRole] = useState<MessageRole>(template?.role ?? "user");
    const [isPublic, setIsPublic] = useState(template?.is_public ?? false);
    const [tagsInput, setTagsInput] = useState((template?.tags ?? []).join(", "));

    const canSave = label.trim().length > 0 && content.trim().length > 0;

    const handleBack = useCallback(() => {
        router.back();
    }, [router]);

    const handleSave = useCallback(async () => {
        if (!canSave || isSaving) return;

        const tags = tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);

        setIsSaving(true);
        try {
            if (mode === "create") {
                const input: CreateContentTemplateInput = {
                    label: label.trim(),
                    content: content.trim(),
                    role,
                    is_public: isPublic,
                    tags,
                };
                await createTemplate(input);
                toast({ title: "Template created" });
            } else if (template?.id) {
                const input: UpdateContentTemplateInput = {
                    id: template.id,
                    label: label.trim(),
                    content: content.trim(),
                    role,
                    is_public: isPublic,
                    tags,
                };
                await updateTemplate(input);
                toast({ title: "Template saved" });
            }
            clearTemplateCache();
            router.back();
        } catch (err) {
            console.error("Error saving template:", err);
            toast({
                title: "Error",
                description: "Failed to save template",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    }, [canSave, isSaving, mode, label, content, role, isPublic, tagsInput, template, toast, router]);

    return (
        <>
            <EditorHeader
                mode={mode}
                isSaving={isSaving}
                canSave={canSave}
                onBack={handleBack}
                onSave={handleSave}
            />

            <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-2xl mx-auto p-4 space-y-4">
                        {/* Label */}
                        <div className="space-y-1.5">
                            <Label htmlFor="label" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Label
                            </Label>
                            <Input
                                id="label"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="Template name"
                                className="text-base"
                                style={{ fontSize: "16px" }}
                            />
                        </div>

                        {/* Role + Visibility row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Type
                                </Label>
                                <Select value={role} onValueChange={(v) => setRole(v as MessageRole)}>
                                    <SelectTrigger className="text-base" style={{ fontSize: "16px" }}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MESSAGE_ROLES.map((r) => (
                                            <SelectItem key={r.value} value={r.value}>
                                                {r.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Visibility
                                </Label>
                                <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-background">
                                    <Switch
                                        id="visibility"
                                        checked={isPublic}
                                        onCheckedChange={setIsPublic}
                                    />
                                    <Label htmlFor="visibility" className="text-sm cursor-pointer select-none">
                                        {isPublic ? "Public" : "Private"}
                                    </Label>
                                </div>
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="space-y-1.5">
                            <Label htmlFor="tags" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Tags <span className="normal-case text-muted-foreground/60">(comma-separated)</span>
                            </Label>
                            <Input
                                id="tags"
                                value={tagsInput}
                                onChange={(e) => setTagsInput(e.target.value)}
                                placeholder="e.g. system, prompt, coding"
                                className="text-base"
                                style={{ fontSize: "16px" }}
                            />
                        </div>

                        {/* Content — full height */}
                        <div className="space-y-1.5">
                            <Label htmlFor="content" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Content
                            </Label>
                            <Textarea
                                id="content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Write your template content here..."
                                className="font-mono text-sm leading-relaxed resize-none"
                                style={{ fontSize: "16px", minHeight: "50vh" }}
                                rows={20}
                            />
                        </div>

                        {/* Spacer for bottom padding */}
                        <div className="h-4" />
                    </div>
                </div>
            </div>
        </>
    );
}
