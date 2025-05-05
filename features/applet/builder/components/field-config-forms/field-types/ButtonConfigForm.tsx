import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { PlusIcon, XIcon } from 'lucide-react';
import { ButtonFieldConfig } from '../../../../runner/components/field-components/types';

interface ButtonConfigFormProps {
  config: Partial<ButtonFieldConfig>;
  onChange: (config: Partial<ButtonFieldConfig>) => void;
}

export const ButtonConfigForm: React.FC<ButtonConfigFormProps> = ({
  config,
  onChange
}) => {
  const [newValue, setNewValue] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...config, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    onChange({ ...config, [name]: value });
  };

  const handleAddValue = () => {
    if (newValue.trim()) {
      const values = [...(config.values || [])];
      values.push(newValue);
      onChange({ ...config, values });
      setNewValue('');
    }
  };

  const handleRemoveValue = (index: number) => {
    const values = [...(config.values || [])];
    values.splice(index, 1);
    onChange({ ...config, values });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Button Title
          </Label>
          <Input
            id="title"
            name="title"
            placeholder="e.g. Select an option"
            value={config.title || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Title that displays above the buttons
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
          <Label htmlFor="gridCols" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Grid Columns
          </Label>
          <Select
            value={config.gridCols || 'grid-cols-2'}
            onValueChange={(value) => handleSelectChange('gridCols', value)}
          >
            <SelectTrigger id="gridCols" className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
              <SelectValue placeholder="Select grid columns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid-cols-1">1 Column</SelectItem>
              <SelectItem value="grid-cols-2">2 Columns</SelectItem>
              <SelectItem value="grid-cols-3">3 Columns</SelectItem>
              <SelectItem value="grid-cols-4">4 Columns</SelectItem>
              <SelectItem value="grid-cols-auto">Auto-fit</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            How many columns to display buttons in
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="buttonClassName" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Button Class Name
          </Label>
          <Input
            id="buttonClassName"
            name="buttonClassName"
            placeholder="e.g. bg-blue-500 text-white hover:bg-blue-600..."
            value={config.buttonClassName || ''}
            onChange={handleChange}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Custom CSS classes for the buttons
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
        <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-4">Button Values</h3>
        
        <div className="flex items-center space-x-2 mb-4">
          <Input
            placeholder="Enter button value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <Button
            onClick={handleAddValue}
            disabled={!newValue.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
        
        {(config.values?.length || 0) > 0 ? (
          <Table className="border border-zinc-200 dark:border-zinc-800">
            <TableHeader className="bg-zinc-100 dark:bg-zinc-800">
              <TableRow>
                <TableHead className="text-zinc-700 dark:text-zinc-300">Value</TableHead>
                <TableHead className="text-zinc-700 dark:text-zinc-300 w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.values?.map((value, index) => (
                <TableRow key={index} className="border-b border-zinc-200 dark:border-zinc-800">
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{value}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveValue(index)}
                      className="h-8 w-8 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center justify-center h-32 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-md">
            <p className="text-zinc-500 dark:text-zinc-400">No button values added yet</p>
          </div>
        )}
      </div>
    </div>
  );
}; 