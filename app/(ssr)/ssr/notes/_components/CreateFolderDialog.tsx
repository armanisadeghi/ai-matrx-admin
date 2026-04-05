"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FOLDER_CATEGORIES, type FolderCategory } from "@/features/notes/constants/folderCategories";

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFolder: (name: string) => void;
  existingFolders?: string[];
}

export default function CreateFolderDialog({
  open,
  onOpenChange,
  onCreateFolder,
  existingFolders = [],
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleClose = () => {
    setFolderName("");
    setSelectedCategory(null);
    setError("");
    onOpenChange(false);
  };

  const handleCategorySelect = (category: FolderCategory) => {
    setSelectedCategory(category.id);
    setFolderName(category.label);
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = folderName.trim();

    if (!trimmed) {
      setError("Folder name cannot be empty");
      return;
    }

    if (
      existingFolders.some(
        (f) => f.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setError("A folder with this name already exists");
      return;
    }

    onCreateFolder(trimmed);
    handleClose();
  };

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-110 bg-black/20"
        onClick={handleClose}
      />

      {/* dialog */}
      <div className="fixed z-120 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(600px,92vw)] max-h-[85vh] flex flex-col p-5 bg-card/95 backdrop-blur-2xl saturate-150 border border-border rounded-xl shadow-xl">
        {/* header */}
        <h3 className="text-sm font-medium mb-0.5">Create New Folder</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Enter a custom name or choose from popular categories below.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1 overflow-hidden">
          {/* name input */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ssr-folder-name" className="text-xs font-medium text-muted-foreground">
              Folder Name
            </label>
            <input
              id="ssr-folder-name"
              className="h-8 px-3 text-sm bg-muted rounded-lg border border-border outline-none text-foreground placeholder:text-muted-foreground"
              value={folderName}
              onChange={(e) => {
                setFolderName(e.target.value);
                setSelectedCategory(null);
                setError("");
              }}
              placeholder="e.g., Work, Personal, Ideas"
              autoFocus
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          {/* category picker */}
          <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
            <span className="text-xs font-medium text-muted-foreground">
              Or Choose a Category
            </span>
            <div className="flex-1 overflow-y-auto pr-1 -mr-1">
              <div className="grid grid-cols-2 gap-1.5">
                {FOLDER_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  const isSelected = selectedCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategorySelect(category)}
                      className={cn(
                        "flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all cursor-pointer",
                        "hover:bg-accent/50",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-transparent"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", category.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs text-foreground leading-tight">
                          {category.label}
                        </div>
                        <div className="text-[11px] text-muted-foreground line-clamp-1 leading-tight mt-0.5">
                          {category.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="px-3 py-1.5 text-xs rounded-md border border-border text-muted-foreground cursor-pointer hover:bg-accent"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90"
            >
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
