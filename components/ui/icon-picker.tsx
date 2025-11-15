'use client';

import React, { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  className?: string;
}

interface IconValidatorProps {
  iconName: string;
  onTest?: () => void;
  showPreview?: boolean;
  className?: string;
}

// Validate if icon exists in Lucide
export const validateIcon = (iconName: string): boolean => {
  return Boolean((LucideIcons as any)[iconName]);
};

// Get all available Lucide icon names
const getAllIconNames = (): string[] => {
  return Object.keys(LucideIcons).filter(
    (key) => 
      key !== 'default' && 
      key !== 'createLucideIcon' &&
      typeof (LucideIcons as any)[key] === 'function'
  );
};

/**
 * Icon Validator - Inline component to validate and preview an icon name
 */
export function IconValidator({ iconName, onTest, showPreview = true, className }: IconValidatorProps) {
  const [validated, setValidated] = useState<boolean | null>(null);

  const handleTest = () => {
    const isValid = validateIcon(iconName);
    setValidated(isValid);
    onTest?.();
  };

  // Auto-validate when icon name changes (debounced)
  React.useEffect(() => {
    if (!iconName) {
      setValidated(null);
      return;
    }

    const timer = setTimeout(() => {
      setValidated(validateIcon(iconName));
    }, 500);

    return () => clearTimeout(timer);
  }, [iconName]);

  const Icon = validated && iconName ? (LucideIcons as any)[iconName] : null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        {validated !== null && (
          <Badge 
            variant={validated ? 'default' : 'destructive'}
            className="text-xs"
          >
            {validated ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Valid
              </>
            ) : (
              <>
                <X className="h-3 w-3 mr-1" />
                Invalid
              </>
            )}
          </Badge>
        )}
        <Button
          type="button"
          onClick={handleTest}
          variant="outline"
          size="sm"
          disabled={!iconName}
        >
          Test Icon
        </Button>
      </div>
      
      {showPreview && validated && Icon && (
        <div className="p-3 bg-muted rounded-md border flex items-center justify-center">
          <Icon className="h-8 w-8" />
        </div>
      )}
    </div>
  );
}

/**
 * Icon Picker - Full modal icon browser with search
 */
export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(value);

  const allIcons = useMemo(() => getAllIconNames(), []);

  const filteredIcons = useMemo(() => {
    if (!searchQuery) return allIcons;
    
    const query = searchQuery.toLowerCase();
    return allIcons.filter(name => 
      name.toLowerCase().includes(query)
    );
  }, [allIcons, searchQuery]);

  const handleSelect = (iconName: string) => {
    setSelectedIcon(iconName);
    onChange(iconName);
    setIsOpen(false);
    setSearchQuery('');
  };

  const CurrentIcon = value ? (LucideIcons as any)[value] : null;

  return (
    <>
      <div className={cn('flex items-center gap-2', className)}>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2"
        >
          {CurrentIcon ? (
            <>
              <CurrentIcon className="h-4 w-4" />
              <span>{value}</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              <span>Choose Icon</span>
            </>
          )}
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Choose an Icon</DialogTitle>
            <DialogDescription>
              Browse and search {allIcons.length} Lucide icons
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search icons... (e.g., 'folder', 'user', 'settings')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Showing {filteredIcons.length} icons</span>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            <ScrollArea className="h-[400px] border rounded-md">
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 p-4">
                {filteredIcons.map((iconName) => {
                  const Icon = (LucideIcons as any)[iconName];
                  const isSelected = iconName === selectedIcon;

                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => handleSelect(iconName)}
                      className={cn(
                        'flex flex-col items-center justify-center p-3 rounded-md border-2 transition-all hover:bg-accent',
                        isSelected 
                          ? 'border-primary bg-primary/10' 
                          : 'border-transparent'
                      )}
                      title={iconName}
                    >
                      <Icon className="h-6 w-6 mb-1" />
                      <span className="text-[10px] text-center truncate w-full">
                        {iconName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Combined Icon Input - Input field with validator and picker
 */
interface IconInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  showPicker?: boolean;
  showValidator?: boolean;
  className?: string;
}

export function IconInput({ 
  value, 
  onChange, 
  label = 'Icon Name',
  placeholder = 'Folder',
  showPicker = true,
  showValidator = true,
  className 
}: IconInputProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium">
          {label}
        </label>
      )}
      
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        {showPicker && (
          <IconPicker value={value} onChange={onChange} />
        )}
      </div>

      {showValidator && value && (
        <IconValidator iconName={value} showPreview />
      )}

      <p className="text-xs text-muted-foreground">
        Enter a Lucide React icon name or use the picker
      </p>
    </div>
  );
}

