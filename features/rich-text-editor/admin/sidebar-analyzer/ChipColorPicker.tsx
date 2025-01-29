'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TailwindColor } from '../../constants';
import { getAllColorOptions } from '../../utils/colorUitls';
import MatrxColorSelectFloatingLabel from '@/components/matrx/MatrxColorSelectFloatingLabel';


interface ColorPickerProps {
  value?: TailwindColor;
  onValueChange?: (value: TailwindColor) => void;
  className?: string;
}

const ChipColorPickerBasic = ({ value, onValueChange, className }: ColorPickerProps) => {
  const colorOptions = getAllColorOptions();

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue>
          {value && (
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${colorOptions.find(opt => opt.color === value)?.className}`} />
              <span className="capitalize">{value}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {colorOptions.map(({ color, className }) => (
          <SelectItem 
            key={color} 
            value={color}
            className="flex items-center gap-2"
          >
            <div className={`w-4 h-4 rounded ${className}`} />
            <span className="capitalize">{color}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const ChipColorPicker = ({ value, onValueChange, className }: ColorPickerProps) => {
  const rawColorOptions = getAllColorOptions();
  
  // Transform the color options to match ColorSelect's expected format
  const colorOptions = rawColorOptions.map(({ color, className }) => ({
    value: color,
    label: color.charAt(0).toUpperCase() + color.slice(1), // Capitalize the color name
    colorClass: className
  }));

  return (
    <MatrxColorSelectFloatingLabel
      options={colorOptions}
      value={value || ''}
      onChange={(newValue) => onValueChange?.(newValue as TailwindColor)}
      className={className}
      placeholder="Select color"
    />
  );
};


export default ChipColorPicker;