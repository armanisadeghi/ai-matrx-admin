import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusIcon, XIcon, EditIcon, CheckIcon } from 'lucide-react';
import { MultiSelectFieldConfig } from '../../../../../a-old-depricated-do-not-use/runner-depreciated-do-not-use/components/field-components/MultiSelectField';
import { SelectOption } from '../../../../../a-old-depricated-do-not-use/runner-depreciated-do-not-use/components/field-components/types';


interface OptionsTabProps {
  config: Partial<MultiSelectFieldConfig>;
  onChange: (config: Partial<MultiSelectFieldConfig>) => void;
}

export const OptionsTab: React.FC<OptionsTabProps> = ({
  config,
  onChange
}) => {
  const [newOption, setNewOption] = useState<Partial<SelectOption>>({ value: '', label: '', group: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
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
  );
};

export default OptionsTab;