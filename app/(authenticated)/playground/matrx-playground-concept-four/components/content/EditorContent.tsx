import { cn } from "@nextui-org/react";
import { X } from "lucide-react";
import React from "react";
import { ContentItem } from "../../types";

interface EditorContentProps {
  content: ContentItem[];
  onRemoveChip: (id: string) => void;
  onUpdateText: (index: number, content: string) => void;
  editorRef: React.RefObject<HTMLDivElement>;
}

const EditorContent = React.memo(
  ({ content, onRemoveChip, onUpdateText, editorRef }: EditorContentProps) => {
    return (
      <>
        {content.map((item, index) =>
          item.type === "chip" ? (
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
                onClick={() => onRemoveChip(item.id!)}
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
              onBlur={(e) =>
                onUpdateText(index, e.currentTarget.textContent || "")
              }
            >
              {item.content}
            </span>
          )
        )}
      </>
    );
  }
);

export default EditorContent;

EditorContent.displayName = "EditorContent";
