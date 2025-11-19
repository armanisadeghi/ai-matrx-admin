'use client';

import React, { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { colord } from 'colord';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Pipette } from 'lucide-react';

interface CategoryColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

// Common category colors for quick selection
const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#64748b', // slate
  '#6b7280', // gray
  '#71717a', // zinc
];

export function CategoryColorPicker({ value, onChange, disabled = false }: CategoryColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  const handleColorChange = (hex: string) => {
    setInputValue(hex);
    onChange(hex);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Validate and update if valid hex color
    try {
      const color = colord(newValue);
      if (color.isValid()) {
        onChange(color.toHex());
      }
    } catch {
      // Invalid color, just update input
    }
  };

  const handleInputBlur = () => {
    // Revert to valid color if invalid
    try {
      const color = colord(inputValue);
      if (!color.isValid()) {
        setInputValue(value);
      }
    } catch {
      setInputValue(value);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Color Preview Box */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-10 h-10 p-0 border-2 hover:scale-105 transition-transform"
            style={{ backgroundColor: value || '#666666' }}
            aria-label="Pick color"
          >
            <Pipette className="w-4 h-4 opacity-0 hover:opacity-100 transition-opacity" style={{ 
              color: colord(value || '#666666').isDark() ? '#ffffff' : '#000000' 
            }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="space-y-3">
            {/* Color Picker */}
            <div>
              <HexColorPicker 
                color={value || '#666666'} 
                onChange={handleColorChange}
                style={{ width: '200px', height: '150px' }}
              />
            </div>

            {/* Preset Colors */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Quick Colors</Label>
              <div className="grid grid-cols-10 gap-1.5">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorChange(color)}
                    className="w-5 h-5 rounded border-2 border-transparent hover:border-foreground transition-all hover:scale-110"
                    style={{ backgroundColor: color }}
                    aria-label={color}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Hex Input */}
            <div>
              <Label className="text-xs font-medium mb-1 block">Hex Code</Label>
              <Input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                placeholder="#666666"
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Hex Input (always visible) */}
      <div className="flex-1">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder="#666666"
          disabled={disabled}
          className="h-10 text-sm font-mono"
        />
      </div>
    </div>
  );
}

