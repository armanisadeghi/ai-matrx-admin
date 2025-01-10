import React, { useState, useEffect, forwardRef } from 'react';
import { Plus, X, Edit, Eye } from 'lucide-react';
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

const EntityTagsManager = forwardRef<HTMLInputElement, TagsManagerProps>(({
  value,
  onChange,
  disabled = false,
  onFocus,
  onBlur,
  className,
}, ref) => {
  const [tags, setTags] = useState<string[]>(() => {
    try {
      return (value && Array.isArray(value.tags)) ? value.tags : [];
    } catch (e) {
      return [];
    }
  });
  
  const [inputValue, setInputValue] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    onChange({ tags });
  }, [tags, onChange]);

  const handleAddTag = () => {
    if (inputValue.trim() && !disabled) {
      const newTag = inputValue.trim();
      if (!tags.includes(newTag)) {
        setTags(prevTags => [...prevTags, newTag]);
        setInputValue('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!disabled) {
      setTags(prevTags => prevTags.filter(tag => tag !== tagToRemove));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
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

  const renderEditMode = () => (
    <div className="relative">
      <div className="mb-2">
        <div className="flex items-center gap-0.5">
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
            className={className}
          />
          <div className="flex gap-0.5">
            <ActionButton
              onClick={handleAddTag}
              disabled={disabled}
              icon={<Plus className="h-4 w-4" />}
            />
            <ActionButton
              onClick={() => setIsEditMode(false)}
              disabled={disabled}
              icon={<Eye className="h-4 w-4" />}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <div
            key={tag}
            className="flex items-center gap-1 px-2 py-0.5 bg-background border rounded-full text-sm"
          >
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
      </div>
    </div>
  );

  const renderViewMode = () => (
    <div className="relative mt-6">
      <div className="flex justify-between items-start">
        <div className="flex-1 flex flex-wrap items-center gap-1 pr-8 mt-6">
          {tags.map((tag) => (
            <div
              key={tag}
              className="px-2 py-0.5 text-sm rounded-full bg-secondary text-secondary-foreground"
            >
              {tag}
            </div>
          ))}
          {tags.length === 0 && (
            <div className="text-sm text-muted-foreground italic">No tags added</div>
          )}
        </div>
        {!disabled && (
          <div className="absolute right-0 top-6">
            <ActionButton
              onClick={() => setIsEditMode(true)}
              icon={<Edit className="h-4 w-4" />}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {isEditMode ? renderEditMode() : renderViewMode()}
    </div>
  );
});

EntityTagsManager.displayName = "EntityTagsManager";

export default EntityTagsManager;