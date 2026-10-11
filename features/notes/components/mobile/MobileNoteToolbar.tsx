"use client";

import React, { useState } from "react";
import { ChevronRight, House, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@ai-matrx/design-system/controls";
import { Badge } from "@/components/ui/badge";

interface MobileNoteToolbarProps {
  /** The note's home, as shown (General / a scope's name). */
  homeLabel: string;
  tags: string[];
  /** Opens the home picker (the one move path: moveNoteToHome). */
  onMoveHome: () => void;
  onTagsChange: (tags: string[]) => void;
  onClose: () => void;
}

export default function MobileNoteToolbar({
  homeLabel,
  tags,
  onMoveHome,
  onTagsChange,
  onClose,
}: MobileNoteToolbarProps) {
  const [newTag, setNewTag] = useState("");

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onTagsChange([...tags, trimmedTag]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <button
          type="button"
          onClick={onMoveHome}
          className="mb-4 flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left text-base"
        >
          <House size={18} className="text-muted-foreground" />
          <span className="flex-1 truncate">{homeLabel}</span>
          <span className="text-sm text-muted-foreground">Move</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
        {(
          /* Tags View */
          <div className="space-y-4">
            {/* Current Tags */}
            {tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">
                  Current Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1 text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Add Tag */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">
                Add Tag
              </h3>
              <div className="flex items-center gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Enter tag name..."
                  onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                  className="flex-1"
                />
                <Button
                  icon={<Plus size={18} />} aria-label="Add tag"
                  variant="primary"
                  onClick={handleAddTag}
                  disabled={!newTag.trim() || tags.includes(newTag.trim())}
                  className="flex-shrink-0"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-border p-4">
        <Button variant="primary" onClick={onClose} className="w-full">
          Done
        </Button>
      </div>
    </div>
  );
}
