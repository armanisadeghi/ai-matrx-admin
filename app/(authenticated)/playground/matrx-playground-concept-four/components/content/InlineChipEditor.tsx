import { cn } from "@nextui-org/react";
import { X } from "lucide-react";
import { useRef, useCallback } from "react";
import { useInlineChipEditor } from "../../hooks/useInlineChipEditor";
import EditorContent from "./EditorContent";

const InlineChipEditor = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const {
    content,
    convertSelectionToChip,
    removeChip,
    updateTextContent,
    getUniqueChips,
  } = useInlineChipEditor();

  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === editorRef.current) {
        const rect = editorRef.current.getBoundingClientRect();
        const clickY = e.clientY;
  
        // Explicitly type as HTMLElement[]
        const textNodes = Array.from(
          editorRef.current.querySelectorAll<HTMLElement>('span[contenteditable="true"]')
        );
        
        let targetNode: HTMLElement | null = null;
        let targetOffset = 0;
  
        for (const node of textNodes) {
          const nodeRect = node.getBoundingClientRect();
          if (clickY >= nodeRect.top && clickY <= nodeRect.bottom) {
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
            targetNode.appendChild(document.createTextNode(""));
          }
  
          range.setStart(targetNode.firstChild!, targetOffset);
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);
          targetNode.focus();
        }
      }
    },
    []
  );

  
  const uniqueChips = getUniqueChips();

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
        <EditorContent
          content={content}
          onRemoveChip={removeChip}
          onUpdateText={updateTextContent}
          editorRef={editorRef}
        />
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
          <div
            className={cn(
              "p-4 border rounded-lg",
              "bg-muted dark:bg-muted",
              "transition-colors"
            )}
          >
            <h3 className="text-sm font-medium text-foreground mb-2">
              Referenced Chips:
            </h3>
            <div className="flex flex-wrap gap-2">
              {uniqueChips.map((chip) => (
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
