import React, { useState, useEffect, forwardRef } from "react";
import { Plus, X, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TagsValue {
    tags: string[];
}

interface TagsManagerProps {
    value: TagsValue | null;
    onChange: (value: TagsValue) => void;
    disabled?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
    className?: string;
}

const EntityTagsManager = forwardRef<HTMLInputElement, TagsManagerProps>(
    ({ value, onChange, disabled = false, onFocus, onBlur, className }, ref) => {
        const [tags, setTags] = useState<string[]>(() => {
            try {
                return value && Array.isArray(value.tags) ? value.tags : [];
            } catch (e) {
                return [];
            }
        });

        const [inputValue, setInputValue] = useState("");
        const [isEditMode, setIsEditMode] = useState(!disabled);

        // Update edit mode when disabled state changes
        useEffect(() => {
            setIsEditMode(!disabled);
        }, [disabled]);

        useEffect(() => {
            onChange({ tags });
        }, [tags, onChange]);

        const handleAddTag = () => {
            if (inputValue.trim() && !disabled) {
                const newTag = inputValue.trim();
                if (!tags.includes(newTag)) {
                    setTags((prevTags) => [...prevTags, newTag]);
                    setInputValue("");
                }
            }
        };

        const handleRemoveTag = (tagToRemove: string) => {
            if (!disabled) {
                setTags((prevTags) => prevTags.filter((tag) => tag !== tagToRemove));
            }
        };

        const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag();
            }
        };

        const handleCopyToClipboard = () => {
            const textToCopy = tags.join(", ");
            navigator.clipboard.writeText(textToCopy);
        };

        const ActionButton: React.FC<{
            onClick: () => void;
            icon: React.ReactNode;
            disabled?: boolean;
        }> = ({ onClick, icon, disabled: buttonDisabled = false }) => (
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onClick();
                }}
                disabled={buttonDisabled}
            >
                {icon}
            </Button>
        );

        return (
            <div className="w-full border-1 border-slate-200 dark:border-slate-700 rounded-xl p-2">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                        {!disabled && (
                            <input
                                ref={ref}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                onFocus={onFocus}
                                onBlur={onBlur}
                                placeholder="Enter tag"
                                disabled={disabled}
                                className={`h-4 px-2 rounded-md border border-input bg-background text-sm ${className}`}
                            />
                        )}
                        <div className="flex gap-0.5">
                            {!disabled && <ActionButton onClick={handleAddTag} disabled={disabled} icon={<Plus className="h-4 w-4" />} />}
                            <ActionButton onClick={handleCopyToClipboard} icon={<Copy className="h-4 w-4" />} />
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                        <div key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-background border rounded-full text-sm">
                            <span>{tag}</span>
                            {!disabled && (
                                <button
                                    onClick={() => handleRemoveTag(tag)}
                                    className="text-muted-foreground hover:text-destructive focus:outline-none"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    ))}
                    {tags.length === 0 && <div className="text-sm text-muted-foreground italic">No tags added</div>}
                </div>
            </div>
        );
    }
);

EntityTagsManager.displayName = "EntityTagsManager";

export default EntityTagsManager;
