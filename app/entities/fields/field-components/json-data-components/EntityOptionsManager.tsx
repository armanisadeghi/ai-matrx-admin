import React, { useState, useEffect, forwardRef, ForwardedRef } from 'react';
import { Plus, X, Edit, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface Option {
  label: string;
  value: string;
}

interface OptionsValue {
  options: Option[];
}

interface OptionsManagerProps {
  value: OptionsValue | null;
  onChange: (value: OptionsValue) => void;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
}

interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  disabled?: boolean;
}

const EntityOptionsManager = forwardRef<HTMLInputElement, OptionsManagerProps>(({
  value,
  onChange,
  disabled = false,
  onFocus,
  onBlur,
  className,
}, ref) => {
  const [options, setOptions] = useState<Option[]>(() => {
    try {
      return (value && Array.isArray(value.options)) ? value.options : [];
    } catch (e) {
      return [];
    }
  });
  
  const [inputValue, setInputValue] = useState('');
  const [nextId, setNextId] = useState(() => {
    const existingIds = options
      .map(opt => opt.value)
      .filter(val => val.startsWith('option_'))
      .map(val => parseInt(val.replace('option_', '')));
    return Math.max(0, ...existingIds) + 1;
  });
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    onChange({ options });
  }, [options, onChange]);

  const handleAddOption = () => {
    if (inputValue.trim() && !disabled) {
      setOptions(prevOptions => [
        ...prevOptions,
        {
          label: inputValue.trim(),
          value: `option_${nextId}`
        }
      ]);
      setNextId(prev => prev + 1);
      setInputValue('');
    }
  };

  const handleRemoveOption = (indexToRemove: number) => {
    if (!disabled) {
      setOptions(prevOptions => prevOptions.filter((_, index) => index !== indexToRemove));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOption();
    }
  };

  const ActionButton: React.FC<ActionButtonProps> = ({ onClick, icon, disabled: buttonDisabled = false }) => (
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
            placeholder="Enter option text"
            disabled={disabled}
            className={className}
          />
          <div className="flex gap-0.5">
            <ActionButton
              onClick={handleAddOption}
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

      <div className="space-y-1">
        {options.map((option, index) => (
          <div
            key={option.value}
            className="flex items-center justify-between p-1.5 rounded text-sm bg-background border"
          >
            <span className="flex-1 px-1">{option.label}</span>
            {!disabled && (
              <ActionButton
                onClick={() => handleRemoveOption(index)}
                icon={<X className="h-4 w-4" />}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderViewMode = () => (
    <div className="relative mt-5">
      <div className="flex justify-between items-start">
        <div className="flex-1 flex flex-wrap items-center gap-1 pr-8 mt-6">
          {options.map((option) => (
            <div
              key={option.value}
              className="px-2 py-0.5 text-sm rounded-full bg-secondary text-secondary-foreground"
            >
              {option.label}
            </div>
          ))}
          {options.length === 0 && (
            <div className="text-sm text-muted-foreground italic">No options added</div>
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

EntityOptionsManager.displayName = "EntityOptionsManager";

export default EntityOptionsManager;