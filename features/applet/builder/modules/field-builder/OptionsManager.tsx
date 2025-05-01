'use client';

import React from 'react';
import { FieldOption } from '../../builder.types';
import { PlusIcon, TrashIcon } from 'lucide-react';

interface OptionsManagerProps {
  options: FieldOption[];
  onOptionChange: (index: number, key: keyof FieldOption, value: string) => void;
  onRemoveOption: (index: number) => void;
  onAddOption: () => void;
}

const OptionsManager: React.FC<OptionsManagerProps> = ({
  options,
  onOptionChange,
  onRemoveOption,
  onAddOption
}) => {
  return (
    <div className="space-y-4 p-3 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Options</h3>
        <button
          type="button"
          onClick={onAddOption}
          className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded inline-flex items-center"
        >
          <PlusIcon className="h-3 w-3 mr-1" />
          Add Option
        </button>
      </div>
      
      {options?.map((option, index) => (
        <div key={option.id} className="p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
              <input
                type="text"
                value={option.label}
                onChange={(e) => onOptionChange(index, 'label', e.target.value)}
                className="w-full p-1.5 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Description</label>
              <div className="flex">
                <input
                  type="text"
                  value={option.description || ''}
                  onChange={(e) => onOptionChange(index, 'description', e.target.value)}
                  className="w-full p-1.5 border border-gray-300 dark:border-gray-700 rounded-l text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => onRemoveOption(index)}
                  className="flex items-center justify-center px-2 border border-l-0 border-gray-300 dark:border-gray-700 rounded-r bg-gray-100 hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900/20 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  title="Remove option"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {(!options || options.length === 0) && (
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
          <p className="text-sm text-gray-500 dark:text-gray-400">No options defined yet.</p>
          <button
            type="button"
            onClick={onAddOption}
            className="mt-2 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded inline-flex items-center justify-center"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Your First Option
          </button>
        </div>
      )}
      
      {options && options.length > 0 && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={onAddOption}
            className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded inline-flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Another Option
          </button>
        </div>
      )}
    </div>
  );
};

export default OptionsManager; 