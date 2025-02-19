import React, { useState, useEffect, forwardRef } from 'react';
import { Plus, X, Edit, Eye, Copy } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldComponentProps } from '../types';

export type EntityTextArrayProps = FieldComponentProps<string[]>;

const EntityTextArray = forwardRef<HTMLInputElement, EntityTextArrayProps>(({
  value,
  onChange,
  disabled,
  className,
  entityKey,
  dynamicFieldInfo,
  density,
  animationPreset,
  size,
  textSize,
  variant,
  floatingLabel,
}, ref) => {
  const [tags, setTags] = useState<string[]>(() => {
    try {
      return Array.isArray(value) ? value : [];
    } catch (e) {
      return [];
    }
  });

  const label = dynamicFieldInfo.displayName;
  
  const [inputValue, setInputValue] = useState('');
  const [isEditMode, setIsEditMode] = useState(!disabled);

  // Update edit mode when disabled state changes
  useEffect(() => {
    setIsEditMode(!disabled);
  }, [disabled]);

  useEffect(() => {
    onChange(tags);
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

  const handleCopyToClipboard = () => {
    const textToCopy = tags.join(', ');
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
    <div className="w-full space-y-2 border-1 border-slate-200 dark:border-slate-700 rounded-md p-2">
      <div className="relative w-full">
        <Input
          ref={ref}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`Enter ${label}`}
          disabled={disabled || !isEditMode}
          className="w-full pr-20"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5">
          {isEditMode ? (
            <>
              <ActionButton
                onClick={handleAddTag}
                disabled={disabled}
                icon={<Plus className="h-4 w-4" />}
              />
              <ActionButton
                onClick={handleCopyToClipboard}
                icon={<Copy className="h-4 w-4" />}
              />
            </>
          ) : (
            <>
              <ActionButton
                onClick={handleCopyToClipboard}
                icon={<Copy className="h-4 w-4" />}
              />
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <div
            key={tag}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-primary/90 to-primary text-primary-foreground shadow-sm"
          >
            <span className="text-sm font-medium">{tag}</span>
            {!disabled && isEditMode && (
              <button
                onClick={() => handleRemoveTag(tag)}
                className="text-primary-foreground/80 hover:text-primary-foreground focus:outline-none transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        {tags.length === 0 && (
          <div className="text-sm text-muted-foreground italic">No {label} added</div>
        )}
      </div>
    </div>
  );
});

EntityTextArray.displayName = "EntityTextArray";

export default EntityTextArray;