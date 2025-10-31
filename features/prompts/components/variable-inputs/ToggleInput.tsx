import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface ToggleInputProps {
  value: string;
  onChange: (value: string) => void;
  offLabel?: string;
  onLabel?: string;
  variableName: string;
}

/**
 * Toggle Input - Returns text value based on toggle state
 */
export function ToggleInput({ 
  value, 
  onChange, 
  offLabel = 'No', 
  onLabel = 'Yes',
  variableName 
}: ToggleInputProps) {
  // Determine if toggle is on based on current value
  const isOn = value === onLabel;
  
  const handleToggle = (checked: boolean) => {
    onChange(checked ? onLabel : offLabel);
  };
  
  return (
    <div className="space-y-4">
      {/* Show current value if it doesn't match toggle options */}
      {value && value !== onLabel && value !== offLabel && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
            Current value:
          </p>
          <p className="text-sm text-amber-900 dark:text-amber-200">
            {value}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            Select an option below to replace
          </p>
        </div>
      )}
      
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="space-y-1">
          <Label className="text-sm font-medium">
            {offLabel} / {onLabel}
          </Label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Currently: <span className="font-medium">{isOn ? onLabel : offLabel}</span>
          </p>
        </div>
        <Switch
          checked={isOn}
          onCheckedChange={handleToggle}
        />
      </div>
    </div>
  );
}

