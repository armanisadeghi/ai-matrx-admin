"use client";

import React from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import MarkdownStream from '@/components/MarkdownStream';
import { cn } from '@/lib/utils';

export interface MatrxSplitProps {
    /** The markdown content to edit and preview */
    value: string;
    /** Called with the new string value whenever the editor content changes */
    onChange: (value: string) => void;
    /** Optional ref forwarded to the underlying <textarea> element */
    textareaRef?: React.Ref<HTMLTextAreaElement>;
    /** Placeholder text shown when the editor is empty */
    placeholder?: string;
    /** Extra className applied to the outer ResizablePanelGroup */
    className?: string;
    /** Initial panel sizes as [leftPercent, rightPercent]. Defaults to [50, 50] */
    defaultLayout?: [number, number];
    /** Extra className for the textarea panel's inner element */
    textareaClassName?: string;
    /** Extra className for the preview panel's inner element */
    previewClassName?: string;
    /** Hide the copy button inside MarkdownStream. Defaults to true */
    hideCopyButton?: boolean;
    /** Message shown in the preview panel when value is empty */
    emptyPreviewMessage?: string;
}

/**
 * MatrxSplit — a resizable two-pane editor/preview component.
 * Left pane: plain textarea for writing markdown.
 * Right pane: live MarkdownStream preview.
 * Draggable divider courtesy of react-resizable-panels.
 */
export function MatrxSplit({
    value,
    onChange,
    textareaRef,
    placeholder = 'Start writing...',
    className,
    defaultLayout = [50, 50],
    textareaClassName,
    previewClassName,
    hideCopyButton = true,
    emptyPreviewMessage = 'Nothing to preview',
}: MatrxSplitProps) {
    return (
        <ResizablePanelGroup
            orientation="horizontal"
            className={cn('h-full w-full', className)}
        >
            <ResizablePanel defaultSize={defaultLayout[0]} minSize={20}>
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    aria-label="Markdown editor"
                    className={cn(
                        'h-full w-full resize-none border-none bg-transparent p-4 text-sm leading-[1.7] font-[inherit] text-foreground outline-none placeholder:text-muted-foreground overflow-y-auto scrollbar-thin-auto',
                        textareaClassName
                    )}
                />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={defaultLayout[1]} minSize={20}>
                <div className={cn('h-full overflow-y-auto py-2 px-5 scrollbar-thin-auto', previewClassName)}>
                    {value.trim() ? (
                        <MarkdownStream
                            content={value}
                            type="text"
                            role="assistant"
                            hideCopyButton={hideCopyButton}
                        />
                    ) : (
                        <p className="py-2 text-sm italic text-muted-foreground">
                            {emptyPreviewMessage}
                        </p>
                    )}
                </div>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}
