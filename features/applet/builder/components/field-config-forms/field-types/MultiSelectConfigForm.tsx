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
import { MultiSelectFieldConfig, SelectOption } from '../../../../a-old-depricated-do-not-use/runner-depreciated-do-not-use/components/field-components/types';

interface MultiSelectConfigFormProps {
  config: Partial<MultiSelectFieldConfig>;
  onChange: (config: Partial<MultiSelectFieldConfig>) => void;
}

export const MultiSelectConfigForm: React.FC<MultiSelectConfigFormProps> = ({
  config,
  onChange
}) => {
  const [newOption, setNewOption] = useState<Partial<SelectOption>>({ value: '', label: '', group: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

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

  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewOption({ ...newOption, [name]: value });
  };

  const handleAddOption = () => {
    if (newOption.value && newOption.label) {
      const options = [...(config.options || [])];
      options.push(newOption as SelectOption);
      onChange({ ...config, options });
      setNewOption({ value: '', label: '', group: '' });
    }
  };

  const handleEditOption = (index: number) => {
    setEditingIndex(index);
    setNewOption({ ...config.options![index] });
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && newOption.value && newOption.label) {
      const options = [...(config.options || [])];
      options[editingIndex] = newOption as SelectOption;
      onChange({ ...config, options });
      setEditingIndex(null);
      setNewOption({ value: '', label: '', group: '' });
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setNewOption({ value: '', label: '', group: '' });
  };

  const handleRemoveOption = (index: number) => {
    const options = [...(config.options || [])];
    options.splice(index, 1);
    onChange({ ...config, options });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="maxItems" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Max Selected Items
          </Label>
          <Input
            id="maxItems"
            name="maxItems"
            type="number"
            placeholder="e.g. 5 (leave empty for unlimited)"
            value={config.maxItems === undefined ? '' : config.maxItems}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Maximum number of items that can be selected
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="searchPlaceholder" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Search Placeholder
          </Label>
          <Input
            id="searchPlaceholder"
            name="searchPlaceholder"
            placeholder="e.g. Search options..."
            value={config.searchPlaceholder || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Placeholder text for the search input
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="emptyMessage" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Empty Message
          </Label>
          <Input
            id="emptyMessage"
            name="emptyMessage"
            placeholder="e.g. No options available"
            value={config.emptyMessage || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Message to display when no options are available
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="showSearch" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Show Search
            </Label>
            <Switch
              id="showSearch"
              checked={config.showSearch || false}
              onCheckedChange={(checked) => handleSwitchChange('showSearch', checked)}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:dark:bg-blue-700"
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Enable search functionality
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="createNewOption" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Create New Options
            </Label>
            <Switch
              id="createNewOption"
              checked={config.createNewOption || false}
              onCheckedChange={(checked) => handleSwitchChange('createNewOption', checked)}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:dark:bg-blue-700"
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Allow users to create new options
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="createNewMessage" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Create New Message
          </Label>
          <Input
            id="createNewMessage"
            name="createNewMessage"
            placeholder='e.g. Create "{input}"'
            value={config.createNewMessage || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Message shown when creating a new option
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="showSelectAll" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Show Select All
            </Label>
            <Switch
              id="showSelectAll"
              checked={config.showSelectAll || false}
              onCheckedChange={(checked) => handleSwitchChange('showSelectAll', checked)}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:dark:bg-blue-700"
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Show option to select all items
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="allowClear" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Allow Clear
            </Label>
            <Switch
              id="allowClear"
              checked={config.allowClear || false}
              onCheckedChange={(checked) => handleSwitchChange('allowClear', checked)}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:dark:bg-blue-700"
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Show button to clear all selections
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
        
        <div className="space-y-2">
          <Label htmlFor="maxHeight" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Max Height
          </Label>
          <Input
            id="maxHeight"
            name="maxHeight"
            placeholder="e.g. 300px"
            value={config.maxHeight || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Maximum height of the dropdown menu
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="chipClassName" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Chip Class Name
          </Label>
          <Input
            id="chipClassName"
            name="chipClassName"
            placeholder="e.g. bg-blue-100 text-blue-800 dark:bg-blue-800..."
            value={config.chipClassName || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Custom CSS classes for the selected item chips
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="dropdownClassName" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Dropdown Class Name
          </Label>
          <Input
            id="dropdownClassName"
            name="dropdownClassName"
            placeholder="e.g. mt-1 border border-zinc-200 dark:border-zinc-700..."
            value={config.dropdownClassName || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Custom CSS classes for the dropdown menu
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
      
      <div className="mt-8 border-t border-zinc-200 dark:border-zinc-700 pt-6">
        <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-4">Options Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
          
          <div className="space-y-2">
            <Label htmlFor="optionGroup" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Group (Optional)
            </Label>
            <Input
              id="optionGroup"
              name="group"
              placeholder="e.g. Group A"
              value={newOption.group || ''}
              onChange={handleOptionChange}
              className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
            />
          </div>
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
                <TableHead className="text-zinc-700 dark:text-zinc-300">Value</TableHead>
                <TableHead className="text-zinc-700 dark:text-zinc-300">Label</TableHead>
                <TableHead className="text-zinc-700 dark:text-zinc-300">Group</TableHead>
                <TableHead className="text-zinc-700 dark:text-zinc-300 w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.options?.map((option, index) => (
                <TableRow key={index} className="border-b border-zinc-200 dark:border-zinc-800">
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{option.value}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{option.label}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{option.group || '-'}</TableCell>
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