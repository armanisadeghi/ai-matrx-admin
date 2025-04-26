import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SliderFieldConfig } from '../../../../runner/components/field-components/types';

interface SliderConfigFormProps {
  config: Partial<SliderFieldConfig>;
  onChange: (config: Partial<SliderFieldConfig>) => void;
}

export const SliderConfigForm: React.FC<SliderConfigFormProps> = ({
  config,
  onChange
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const updatedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    onChange({ ...config, [name]: updatedValue });
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    onChange({ ...config, [name]: checked });
  };

  const handleSelectChange = (name: string, value: string) => {
    onChange({ ...config, [name]: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="min" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Minimum Value
          </Label>
          <Input
            id="min"
            name="min"
            type="number"
            placeholder="e.g. 0"
            value={config.min === undefined ? '' : config.min}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Minimum value of the slider
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="max" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Maximum Value
          </Label>
          <Input
            id="max"
            name="max"
            type="number"
            placeholder="e.g. 100"
            value={config.max === undefined ? '' : config.max}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Maximum value of the slider
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="step" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Step Value
          </Label>
          <Input
            id="step"
            name="step"
            type="number"
            placeholder="e.g. 1"
            value={config.step === undefined ? '' : config.step}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Step size for incrementing/decrementing the slider
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="showMarks" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Show Marks
            </Label>
            <Switch
              id="showMarks"
              checked={config.showMarks || false}
              onCheckedChange={(checked) => handleSwitchChange('showMarks', checked)}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:dark:bg-blue-700"
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Display marks on the slider track
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="markCount" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Mark Count
          </Label>
          <Input
            id="markCount"
            name="markCount"
            type="number"
            placeholder="e.g. 5"
            value={config.markCount === undefined ? '' : config.markCount}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Number of marks to display on the slider track
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="showInput" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Show Input
            </Label>
            <Switch
              id="showInput"
              checked={config.showInput || false}
              onCheckedChange={(checked) => handleSwitchChange('showInput', checked)}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:dark:bg-blue-700"
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Display a numeric input field alongside the slider
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="showMinMaxLabels" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Show Min/Max Labels
            </Label>
            <Switch
              id="showMinMaxLabels"
              checked={config.showMinMaxLabels || false}
              onCheckedChange={(checked) => handleSwitchChange('showMinMaxLabels', checked)}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:dark:bg-blue-700"
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Display labels for minimum and maximum values
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="range" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Range Mode
            </Label>
            <Switch
              id="range"
              checked={config.range || false}
              onCheckedChange={(checked) => handleSwitchChange('range', checked)}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:dark:bg-blue-700"
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Enable range selection with two handles
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minLabel" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Minimum Label
          </Label>
          <Input
            id="minLabel"
            name="minLabel"
            placeholder="e.g. Min"
            value={config.minLabel || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Custom label for the minimum value
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="maxLabel" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Maximum Label
          </Label>
          <Input
            id="maxLabel"
            name="maxLabel"
            placeholder="e.g. Max"
            value={config.maxLabel || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Custom label for the maximum value
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="valuePrefix" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Value Prefix
          </Label>
          <Input
            id="valuePrefix"
            name="valuePrefix"
            placeholder="e.g. $"
            value={config.valuePrefix || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Text to display before the value
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="valueSuffix" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Value Suffix
          </Label>
          <Input
            id="valueSuffix"
            name="valueSuffix"
            placeholder="e.g. kg"
            value={config.valueSuffix || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Text to display after the value
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="trackClassName" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Track Class Name
          </Label>
          <Input
            id="trackClassName"
            name="trackClassName"
            placeholder="e.g. bg-blue-200 dark:bg-blue-800..."
            value={config.trackClassName || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Custom CSS classes for the slider track
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="thumbClassName" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Thumb Class Name
          </Label>
          <Input
            id="thumbClassName"
            name="thumbClassName"
            placeholder="e.g. bg-blue-500 dark:bg-blue-600..."
            value={config.thumbClassName || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Custom CSS classes for the slider thumb
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="sliderClassName" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Slider Class Name
          </Label>
          <Input
            id="sliderClassName"
            name="sliderClassName"
            placeholder="e.g. w-full h-2..."
            value={config.sliderClassName || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Custom CSS classes for the entire slider component
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="width" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Width
          </Label>
          <Select
            value={config.width || 'w-full'}
            onValueChange={(value) => handleSelectChange('width', value)}
          >
            <SelectTrigger id="width" className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
              <SelectValue placeholder="Select width" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="w-full">Full width</SelectItem>
              <SelectItem value="w-auto">Auto width</SelectItem>
              <SelectItem value="w-1/2">Half width</SelectItem>
              <SelectItem value="w-1/3">One-third width</SelectItem>
              <SelectItem value="w-2/3">Two-thirds width</SelectItem>
              <SelectItem value="w-1/4">Quarter width</SelectItem>
              <SelectItem value="w-3/4">Three-quarters width</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Controls the width of the field container
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="subtitle" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Subtitle
          </Label>
          <Input
            id="subtitle"
            name="subtitle"
            placeholder="Optional subtitle"
            value={config.subtitle || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Additional text displayed below the label
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="helpText" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Help Text
          </Label>
          <Input
            id="helpText"
            name="helpText"
            placeholder="Optional help text"
            value={config.helpText || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Helpful text displayed below the field
          </p>
        </div>
      </div>
    </div>
  );
}; 