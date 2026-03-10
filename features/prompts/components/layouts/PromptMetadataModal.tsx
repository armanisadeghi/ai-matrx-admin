"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectAllUserPrompts } from "@/lib/redux/slices/promptCacheSlice";
import { updateUserPrompt } from "@/lib/redux/thunks/promptCrudThunks";
import { toast } from "@/lib/toast-service";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { X, Tag, Star, Archive, Sparkles, Loader2 } from "lucide-react";
import type { PromptData } from "../../types/core";
import { usePromptCategorizer } from "../../hooks/usePromptCategorizer";

interface PromptMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: PromptData;
}

function TagInput({
  tags,
  onTagsChange,
  suggestions,
}: {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestions: string[];
}) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(input.toLowerCase()) &&
      !tags.includes(s) &&
      input.length > 0,
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]);
    }
    setInput("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[36px]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Type and press Enter to add..."
          className="h-10 text-base"
          style={{ fontSize: "16px" }}
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-32 overflow-y-auto">
            {filteredSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(s)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryInput({
  value,
  onChange,
  suggestions,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(value.toLowerCase()) &&
      s !== value &&
      value.length > 0,
  );

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder="e.g. Writing, Code, Research..."
        className="h-10 text-base"
        style={{ fontSize: "16px" }}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-32 overflow-y-auto">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(s);
                setShowSuggestions(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MetadataForm({
  prompt,
  onClose,
}: {
  prompt: PromptData;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const allPrompts = useAppSelector(selectAllUserPrompts);
  const {
    categorize,
    status: categorizerStatus,
    error: categorizerError,
  } = usePromptCategorizer();

  const [name, setName] = useState(prompt.name ?? "");
  const [description, setDescription] = useState(prompt.description ?? "");
  const [category, setCategory] = useState(prompt.category ?? "");
  const [tags, setTags] = useState<string[]>(prompt.tags ?? []);
  const [isFavorite, setIsFavorite] = useState(prompt.isFavorite ?? false);
  const [isArchived, setIsArchived] = useState(prompt.isArchived ?? false);
  const [isSaving, setIsSaving] = useState(false);

  const isCategorizing = categorizerStatus === "loading";

  const handleAutoCategorize = async () => {
    if (!prompt.id) return;
    const result = await categorize(prompt.id);
    if (!result) {
      if (categorizerStatus === "error") {
        toast.error(categorizerError ?? "Auto-categorization failed");
      }
      return;
    }
    if (result.category) setCategory(result.category);
    if (result.tags.length > 0) {
      setTags((prev) => {
        const merged = [
          ...prev,
          ...result.tags.filter((t) => !prev.includes(t)),
        ];
        return merged;
      });
    }
    if (result.description) setDescription(result.description);
    toast.success("Fields pre-filled — review and save when ready");
  };

  const existingCategories = Array.from(
    new Set(allPrompts.map((p) => p.category).filter(Boolean) as string[]),
  ).sort();

  const existingTags = Array.from(
    new Set(allPrompts.flatMap((p) => p.tags ?? [])),
  ).sort();

  const handleSave = async () => {
    if (!prompt.id) return;
    setIsSaving(true);
    try {
      await dispatch(
        updateUserPrompt({
          id: prompt.id,
          data: {
            name: name || undefined,
            description: description || undefined,
            category: category || undefined,
            tags: tags.length > 0 ? tags : undefined,
            isFavorite,
            isArchived,
          },
        }),
      ).unwrap();
      toast.success("Prompt updated");
      onClose();
    } catch (err) {
      console.error("Failed to update prompt metadata:", err);
      toast.error("Failed to update prompt");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 px-1">
      <div className="space-y-1.5">
        <Label htmlFor="meta-name">Name</Label>
        <Input
          id="meta-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Prompt name"
          className="h-10 text-base"
          style={{ fontSize: "16px" }}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meta-desc">Description</Label>
        <Textarea
          id="meta-desc"
          autoGrow
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description..."
          className="text-base resize-none"
          style={{ fontSize: "16px" }}
        />
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAutoCategorize}
        disabled={isCategorizing || isSaving}
        className="w-full flex items-center gap-2"
      >
        {isCategorizing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 text-primary" />
        )}
        {isCategorizing ? "Categorizing..." : "Auto-Categorize with AI"}
      </Button>

      <div className="space-y-1.5">
        <Label>Category</Label>
        <CategoryInput
          value={category}
          onChange={setCategory}
          suggestions={existingCategories}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5" />
          Tags
        </Label>
        <TagInput
          tags={tags}
          onTagsChange={setTags}
          suggestions={existingTags}
        />
      </div>

      <div className="flex items-center justify-between py-1">
        <Label className="flex items-center gap-1.5 cursor-pointer">
          <Star
            className={cn(
              "h-4 w-4",
              isFavorite
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground",
            )}
          />
          Favorite
        </Label>
        <Switch checked={isFavorite} onCheckedChange={setIsFavorite} />
      </div>

      <div className="flex items-center justify-between py-1">
        <Label className="flex items-center gap-1.5 cursor-pointer">
          <Archive
            className={cn(
              "h-4 w-4",
              isArchived ? "text-muted-foreground" : "text-muted-foreground",
            )}
          />
          Archived
        </Label>
        <Switch checked={isArchived} onCheckedChange={setIsArchived} />
      </div>

      <div className="flex gap-2 pt-2 pb-safe">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1 h-10"
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className="flex-1 h-10"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </div>
  );
}

/*
    width = "90vw",
    height = "95dvh",

*/

export function PromptMetadataModal({
  isOpen,
  onClose,
  prompt,
}: PromptMetadataModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[90dvh]">
          <DrawerHeader>
            <DrawerTitle>Edit Details</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <MetadataForm prompt={prompt} onClose={onClose} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Details</DialogTitle>
        </DialogHeader>
        <MetadataForm prompt={prompt} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
