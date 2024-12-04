import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from "@/lib/utils"; // Assuming you have this from shadcn/ui

interface ContentItem {
    type: 'text' | 'chip';
    content: string;
    id?: string;
}

const InlineChipEditor = () => {
    const [content, setContent] = useState<ContentItem[]>([
        { type: 'text', content: 'Try typing some text and selecting words to\n' },
        { type: 'chip', content: 'convert into chips', id: '1' },
        { type: 'text', content: '\nlike this one!' }
    ]);

    const editorRef = useRef<HTMLDivElement>(null);
    const nextChipId = useRef(2);

    const convertSelectionToChip = () => {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();
        if (!selectedText) return;

        let startNode = range.startContainer as Node;
        let endNode = range.endContainer as Node;

        if (startNode.nodeType === Node.TEXT_NODE) {
            startNode = startNode.parentNode as Node;
        }
        if (endNode.nodeType === Node.TEXT_NODE) {
            endNode = endNode.parentNode as Node;
        }

        let startNodeIndex = -1;
        let endNodeIndex = -1;

        content.forEach((item, index) => {
            if (item.type === 'text') {
                if (startNode && startNode.textContent?.includes(item.content)) {
                    startNodeIndex = index;
                }
                if (endNode && endNode.textContent?.includes(item.content)) {
                    endNodeIndex = index;
                }
            }
        });

        if (startNodeIndex === -1) return;

        const startOffset = range.startOffset;
        const endOffset = range.endOffset;

        const beforeText = content[startNodeIndex].content.slice(0, startOffset);
        const afterText = content[startNodeIndex].content.slice(endOffset);
        const chipId = String(nextChipId.current++);

        const newContent = [
            ...content.slice(0, startNodeIndex),
            { type: 'text', content: beforeText },
            { type: 'chip', content: selectedText, id: chipId },
            { type: 'text', content: afterText },
            ...content.slice(startNodeIndex + 1)
        ].filter(item => item.content !== '');

        //@ts-ignore
        setContent(newContent);
        selection.removeAllRanges();

        setTimeout(() => {
            if (!editorRef.current) return;

            const textNodes = editorRef.current.querySelectorAll('span[contenteditable="true"]');
            const chipNodes = editorRef.current.querySelectorAll('span:not([contenteditable="true"])');
            for (let i = 0; i < chipNodes.length; i++) {
                if (chipNodes[i].textContent?.includes(selectedText)) {
                    const nextText = textNodes[i + 1] as HTMLElement;
                    if (nextText) {
                        const range = document.createRange();
                        const selection = window.getSelection();
                        range.setStart(nextText.firstChild || nextText, 0);
                        range.collapse(true);
                        selection?.removeAllRanges();
                        selection?.addRange(range);
                        nextText.focus();
                    }
                    break;
                }
            }
        }, 0);
    };

    const removeChip = (chipId: string) => {
        const newContent = content.map(item => {
            if (item.type === 'chip' && item.id === chipId) {
                return { type: 'text', content: item.content };
            }
            return item;
        });

        const mergedContent = newContent.reduce((acc: ContentItem[], curr) => {
            if (curr.type === 'text' && acc.length > 0 && acc[acc.length - 1].type === 'text') {
                acc[acc.length - 1].content += curr.content;
                return acc;
            }
            return [...acc, curr];
        }, []);

        //@ts-ignore
        setContent(mergedContent);
    };

    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === editorRef.current) {
            const rect = editorRef.current.getBoundingClientRect();
            const clickY = e.clientY;

            const textNodes = Array.from(editorRef.current.querySelectorAll('span[contenteditable="true"]'));
            let targetNode: HTMLElement | null = null;
            let targetOffset = 0;

            for (const node of textNodes) {
                const nodeRect = node.getBoundingClientRect();
                if (clickY >= nodeRect.top && clickY <= nodeRect.bottom) {
                    //@ts-ignore
                    targetNode = node;
                    const relativeX = e.clientX - nodeRect.left;
                    const charWidth = nodeRect.width / (node.textContent?.length || 1);
                    targetOffset = Math.min(
                        Math.max(Math.round(relativeX / charWidth), 0),
                        node.textContent?.length || 0
                    );
                    break;
                }
            }

            if (targetNode) {
                const range = document.createRange();
                const selection = window.getSelection();

                if (!targetNode.firstChild) {
                    targetNode.appendChild(document.createTextNode(''));
                }

                range.setStart(targetNode.firstChild!, targetOffset);
                range.collapse(true);
                selection?.removeAllRanges();
                selection?.addRange(range);
                targetNode.focus();
            }
        }
    };

    const uniqueChips = content
        .filter(item => item.type === 'chip')
        .reduce((acc: ContentItem[], curr) => {
            if (!acc.find(chip => chip.id === curr.id)) {
                acc.push(curr);
            }
            return acc;
        }, []);

    return (
        <div className="w-full max-w-2xl mx-auto p-4">
            <div
                ref={editorRef}
                className={cn(
                    "min-h-[200px] p-4 border rounded-lg",
                    "bg-background dark:bg-background",
                    "focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent",
                    "transition-colors duration-200"
                )}
                onClick={handleContainerClick}
            >
                {content.map((item, index) => (
                    item.type === 'chip' ? (
                        <span
                            key={`${item.id}-${index}`}
                            className={cn(
                                "inline-flex items-center gap-1 px-2 py-1 rounded-full",
                                "bg-purple-100 dark:bg-purple-900",
                                "text-purple-800 dark:text-purple-100",
                                "text-sm mx-1"
                            )}
                        >
              {item.content}
                            <button
                                onClick={() => removeChip(item.id!)}
                                className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5 transition-colors"
                            >
                <X size={14} />
              </button>
            </span>
                    ) : (
                        <span
                            key={index}
                            contentEditable={true}
                            suppressContentEditableWarning={true}
                            className="outline-none whitespace-pre-wrap text-foreground"
                            onBlur={(e) => {
                                const newContent = [...content];
                                newContent[index].content = e.currentTarget.textContent || '';
                                setContent(newContent);
                            }}
                        >
              {item.content}
            </span>
                    )
                ))}
            </div>

            <div className="mt-4 space-y-4">
                <div className="flex gap-4">
                    <button
                        onClick={convertSelectionToChip}
                        className={cn(
                            "px-4 py-2 rounded",
                            "bg-primary text-primary-foreground",
                            "hover:bg-primary/90",
                            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                            "transition-colors"
                        )}
                    >
                        Convert Selection to Chip
                    </button>
                </div>

                {uniqueChips.length > 0 && (
                    <div className={cn(
                        "p-4 border rounded-lg",
                        "bg-muted dark:bg-muted",
                        "transition-colors"
                    )}>
                        <h3 className="text-sm font-medium text-foreground mb-2">Referenced Chips:</h3>
                        <div className="flex flex-wrap gap-2">
                            {uniqueChips.map(chip => (
                                <span
                                    key={chip.id}
                                    className={cn(
                                        "inline-flex items-center gap-1 px-2 py-1 rounded-full",
                                        "bg-purple-100 dark:bg-purple-900",
                                        "text-purple-800 dark:text-purple-100",
                                        "text-sm"
                                    )}
                                >
                  {chip.content}
                                    <button
                                        onClick={() => removeChip(chip.id!)}
                                        className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5 transition-colors"
                                    >
                    <X size={14} />
                  </button>
                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InlineChipEditor;
