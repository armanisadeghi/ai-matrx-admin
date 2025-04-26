import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusIcon, XIcon, EditIcon, CheckIcon } from 'lucide-react';
import { RadioGroupFieldConfig, RadioOption } from '../../../../runner/components/field-components/types';

interface RadioConfigFormProps {
  config: Partial<RadioGroupFieldConfig>;
  onChange: (config: Partial<RadioGroupFieldConfig>) => void;
}

export const RadioConfigForm: React.FC<RadioConfigFormProps> = ({
  config,
  onChange
}) => {
  const [newOption, setNewOption] = useState<Partial<RadioOption>>({ value: '', label: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...config, [name]: value });
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    onChange({ ...config, [name]: checked });
  };

  const handleSelectChange = (name: string, value: string) => {
    onChange({ ...config, [name]: value });
  };

  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewOption({ ...newOption, [name]: value });
  };

  const handleAddOption = () => {
    if (newOption.value && newOption.label) {
      const options = [...(config.options || [])];
      options.push(newOption as RadioOption);
      onChange({ ...config, options });
      setNewOption({ value: '', label: '' });
    }
  };

  const handleEditOption = (index: number) => {
    setEditingIndex(index);
    setNewOption({ ...config.options![index] });
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && newOption.value && newOption.label) {
      const options = [...(config.options || [])];
      options[editingIndex] = newOption as RadioOption;
      onChange({ ...config, options });
      setEditingIndex(null);
      setNewOption({ value: '', label: '' });
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setNewOption({ value: '', label: '' });
  };

  const handleRemoveOption = (index: number) => {
    const options = [...(config.options || [])];
    options.splice(index, 1);
    onChange({ ...config, options });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="includeOther" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Include "Other" Option
            </Label>
            <Switch
              id="includeOther"
              checked={config.includeOther || false}
              onCheckedChange={(checked) => handleSwitchChange('includeOther', checked)}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:dark:bg-blue-700"
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Add an "Other" option with a text input
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="otherPlaceholder" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            "Other" Input Placeholder
          </Label>
          <Input
            id="otherPlaceholder"
            name="otherPlaceholder"
            placeholder="e.g. Please specify..."
            value={config.otherPlaceholder || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Placeholder text for the "Other" text input
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="direction" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Layout Direction
          </Label>
          <Select
            value={config.direction || 'vertical'}
            onValueChange={(value) => handleSelectChange('direction', value as 'vertical' | 'horizontal')}
          >
            <SelectTrigger id="direction" className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
              <SelectValue placeholder="Select layout direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vertical">Vertical</SelectItem>
              <SelectItem value="horizontal">Horizontal</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            How radio options are arranged
          </p>
        </div>
        
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="radioClassName" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Radio Class Name
          </Label>
          <Input
            id="radioClassName"
            name="radioClassName"
            placeholder="e.g. rounded-full border-gray-300 dark:border-gray-600..."
            value={config.radioClassName || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Custom CSS classes for the radio buttons
          </p>
        </div>
      </div>
      
      <div className="mt-8 border-t border-zinc-200 dark:border-zinc-700 pt-6">
        <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-4">Options Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="space-y-2">
            <Label htmlFor="optionId" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              ID
            </Label>
            <Input
              id="optionId"
              name="id"
              placeholder="e.g. option-1"
              value={newOption.id || ''}
              onChange={handleOptionChange}
              className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="optionValue" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Value
            </Label>
            <Input
              id="optionValue"
              name="value"
              placeholder="e.g. option-1"
              value={newOption.value || ''}
              onChange={handleOptionChange}
              className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="optionLabel" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Label
            </Label>
            <Input
              id="optionLabel"
              name="label"
              placeholder="e.g. Option 1"
              value={newOption.label || ''}
              onChange={handleOptionChange}
              className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
            />
          </div>
        </div>
        
        <div className="space-y-2 mb-4">
          <Label htmlFor="optionDescription" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Description (Optional)
          </Label>
          <Input
            id="optionDescription"
            name="description"
            placeholder="e.g. Additional information about this option"
            value={newOption.description || ''}
            onChange={handleOptionChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
        </div>
        
        <div className="flex justify-end mb-6">
          {editingIndex !== null ? (
            <div className="flex space-x-2">
              <Button
                onClick={handleCancelEdit}
                variant="outline"
                className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={!newOption.value || !newOption.label}
                className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleAddOption}
              disabled={!newOption.value || !newOption.label}
              className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Option
            </Button>
          )}
        </div>
        
        {(config.options?.length || 0) > 0 ? (
          <Table className="border border-zinc-200 dark:border-zinc-800">
            <TableHeader className="bg-zinc-100 dark:bg-zinc-800">
              <TableRow>
                <TableHead className="text-zinc-700 dark:text-zinc-300">ID</TableHead>
                <TableHead className="text-zinc-700 dark:text-zinc-300">Value</TableHead>
                <TableHead className="text-zinc-700 dark:text-zinc-300">Label</TableHead>
                <TableHead className="text-zinc-700 dark:text-zinc-300">Description</TableHead>
                <TableHead className="text-zinc-700 dark:text-zinc-300 w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.options?.map((option, index) => (
                <TableRow key={index} className="border-b border-zinc-200 dark:border-zinc-800">
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{option.id}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{option.value}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{option.label}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{option.description || '-'}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">
                    <div className="flex space-x-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEditOption(index)}
                        className="h-8 w-8 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <EditIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveOption(index)}
                        className="h-8 w-8 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center justify-center h-32 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-md">
            <p className="text-zinc-500 dark:text-zinc-400">No options added yet</p>
          </div>
        )}
      </div>
    </div>
  );
}; 