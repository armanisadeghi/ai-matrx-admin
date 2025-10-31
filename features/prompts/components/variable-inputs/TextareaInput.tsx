import React from 'react';
import { Label } from '@/components/ui/label';

interface TextareaInputProps {
  value: string;
  onChange: (value: string) => void;
  variableName: string;
}

/**
 * Textarea Input - Multi-line text input (default behavior)
 */
export function TextareaInput({ 
  value, 
  onChange, 
  variableName 
}: TextareaInputProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        Enter text
      </Label>
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${variableName.toLowerCase()}...`}
        className="flex-1 w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 scrollbar-thin min-h-[200px]"
        autoFocus
      />
    </div>
  );
}

