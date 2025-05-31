import React, { useMemo, useCallback } from 'react';
import MultiSelect from '@/components/ui/loaders/multi-select-updated-two';

import { Filter, CheckSquare, XSquare } from 'lucide-react';
import { UseFieldVisibilityReturn } from '../../hooks/form-related/useFieldVisibility';

interface FieldSelectionControlsProps {
    fieldVisibility: UseFieldVisibilityReturn;
    showControls?: boolean;
}

const FieldSelectionControls: React.FC<FieldSelectionControlsProps> = ({ 
    fieldVisibility,
    showControls = true 
}) => {
    const { selectAllFields, clearAllFields, selectOptions, toggleField, visibleFields } = fieldVisibility;

    // Convert visibleFields to string array for MultiSelect value prop
    const selectedValues = useMemo(() => {
        return visibleFields.map(field => String(field));
    }, [visibleFields]);

    // Handle field selection changes from MultiSelect
    const handleFieldSelection = useCallback((newSelectedValues: string[]) => {
        // Get currently selected fields as strings
        const currentSelected = new Set(selectedValues);
        const newSelected = new Set(newSelectedValues);
        
        // Find fields that were added or removed
        for (const fieldValue of selectOptions.map(opt => opt.value)) {
            const fieldStr = String(fieldValue);
            const wasSelected = currentSelected.has(fieldStr);
            const isSelected = newSelected.has(fieldStr);
            
            // If selection state changed, toggle the field
            if (wasSelected !== isSelected) {
                toggleField(fieldValue);
            }
        }
    }, [selectedValues, selectOptions, toggleField]);

    const buttonClasses = "p-1 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100";

    return (
        <div className="flex gap-2 items-center">
            <MultiSelect
                options={selectOptions}
                value={selectedValues}
                onChange={handleFieldSelection}
                icon={Filter}
                displayMode="icon"
                iconPadding="p-2"
                showSelectedInDropdown={true}
                placeholder="Select fields to show"
            />
            {showControls && (
                <>
                    <button
                        onClick={selectAllFields}
                        className={buttonClasses}
                        title="Select All Fields"
                    >
                        <CheckSquare size={16} />
                    </button>
                    <button
                        onClick={clearAllFields}
                        className={buttonClasses}
                        title="Clear All Fields"
                    >
                        <XSquare size={16} />
                    </button>
                </>
            )}
        </div>
    );
};

export default FieldSelectionControls;