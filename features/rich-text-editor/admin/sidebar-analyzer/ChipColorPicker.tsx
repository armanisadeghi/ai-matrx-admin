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


interface ColorPickerProps {
  value?: TailwindColor;
  onValueChange?: (value: TailwindColor) => void;
  className?: string;
}

const ChipColorPicker = ({ value, onValueChange, className }: ColorPickerProps) => {
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

export default ChipColorPicker;