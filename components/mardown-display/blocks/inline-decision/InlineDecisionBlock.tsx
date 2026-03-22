"use client";

import React, { useState, useRef, useEffect } from "react";
import { Pencil, Loader2 } from "lucide-react";
import type { InlineDecision, InlineDecisionOption } from "./types";

interface InlineDecisionBlockProps {
    decision: InlineDecision;
    isStreamActive?: boolean;
    onResolve: (decisionId: string, rawXml: string, chosenText: string) => void;
    rawXml: string;
}

export default function InlineDecisionBlock({
    decision,
    isStreamActive = false,
    onResolve,
    rawXml,
}: InlineDecisionBlockProps) {
    const [expanded, setExpanded] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [fadeOut, setFadeOut] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const allOptions: InlineDecisionOption[] = decision.options.some(
        (o) => o.id === "custom"
    )
        ? decision.options
        : [
              ...decision.options,
              { id: "custom", label: "Custom", text: "" },
          ];

    useEffect(() => {
        if (selectedId && textareaRef.current) {
            const ta = textareaRef.current;
            ta.focus();
            ta.setSelectionRange(ta.value.length, ta.value.length);
            ta.style.height = "auto";
            ta.style.height = `${ta.scrollHeight}px`;
        }
    }, [selectedId]);

    const handleSelect = (option: InlineDecisionOption) => {
        if (selectedId === option.id) {
            setSelectedId(null);
            setEditText("");
            return;
        }
        setSelectedId(option.id);
        setEditText(option.text);
    };

    const handleApply = () => {
        if (!editText.trim() || isStreamActive) return;
        setFadeOut(true);
        setTimeout(() => {
            onResolve(decision.id, rawXml, editText.trim());
        }, 280);
    };

    const handleCancel = () => {
        setSelectedId(null);
        setEditText("");
    };

    const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditText(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    return (
        <div
            className={`my-1.5 border rounded-md overflow-hidden transition-all duration-200 ${
                expanded
                    ? "border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.1)]"
                    : "border-border"
            } ${fadeOut ? "opacity-0 -translate-y-1 scale-[0.99] transition-all duration-[280ms]" : ""} bg-card`}
        >
            {/* Header — click to toggle options */}
            <div
                role="button"
                tabIndex={0}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors duration-100"
                onClick={() => {
                    setExpanded(!expanded);
                    if (expanded) {
                        setSelectedId(null);
                        setEditText("");
                    }
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded); } }}
            >
                <span
                    className={`w-2 h-2 rounded-full bg-primary flex-shrink-0 ${
                        expanded ? "" : "animate-pulse"
                    } shadow-[0_0_6px_hsl(var(--primary)/0.4)]`}
                />
                <span className="text-sm font-medium text-foreground truncate">
                    {decision.prompt}
                </span>
            </div>

            {/* Expanded body */}
            {expanded && (
                <div className="px-3.5 pt-0.5 pb-3.5 animate-in slide-in-from-top-1 duration-150">
                    {/* Option pills */}
                    <div className="flex flex-wrap gap-1.5 mb-0.5">
                        {allOptions.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                className={`text-xs px-3 py-1.5 rounded border transition-all duration-100 flex items-center ${
                                    selectedId === option.id
                                        ? "border-primary/50 bg-primary/10 text-primary"
                                        : "border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground hover:bg-muted/50"
                                } ${option.id === "custom" ? "border-dashed" : ""}`}
                                onClick={() => handleSelect(option)}
                            >
                                {option.id === "custom" && (
                                    <Pencil className="w-3 h-3 mr-1 flex-shrink-0" />
                                )}
                                {option.label}
                            </button>
                        ))}
                    </div>

                    {/* Editable textarea */}
                    {selectedId && (
                        <div className="mt-2.5 animate-in fade-in slide-in-from-bottom-1 duration-150">
                            <textarea
                                ref={textareaRef}
                                className="w-full text-sm leading-relaxed text-foreground bg-background/50 border border-border rounded px-3 py-2.5 resize-none overflow-hidden outline-none focus:border-primary/50 transition-colors duration-150 placeholder:text-muted-foreground/50"
                                style={{ fontSize: "16px" }}
                                value={editText}
                                onChange={handleTextareaInput}
                                placeholder={
                                    selectedId === "custom"
                                        ? "Write your own approach..."
                                        : "Edit before applying..."
                                }
                                rows={2}
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button
                                    type="button"
                                    className="text-xs font-medium px-3.5 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-all duration-100"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </button>
                                {isStreamActive ? (
                                    <span className="text-xs font-medium px-3.5 py-1.5 rounded bg-muted text-muted-foreground flex items-center gap-1.5">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Waiting for response...
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        className="text-xs font-medium px-3.5 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-35 disabled:cursor-not-allowed transition-all duration-100"
                                        onClick={handleApply}
                                        disabled={!editText.trim()}
                                    >
                                        Apply
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
