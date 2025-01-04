import React from 'react';
import MultiSelect from '@/components/ui/loaders/multi-select';
import { UseFieldVisibilityReturn } from '@/lib/redux/entity/hooks/useFieldVisibility';
import { Filter, CheckSquare, XSquare } from 'lucide-react';

interface FieldSelectionControlsProps {
    fieldVisibility: UseFieldVisibilityReturn;
    showControls?: boolean;
}

const FieldSelectionControls: React.FC<FieldSelectionControlsProps> = ({ 
    fieldVisibility,
    showControls = true 
}) => {
    const { selectAllFields, clearAllFields, selectOptions, handleFieldSelection, selectedValues } = fieldVisibility;

    const buttonClasses = "p-1 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100";

    return (
        <div className="flex gap-2 items-center">
            <MultiSelect
                options={selectOptions}
                value={selectedValues}
                onChange={handleFieldSelection}
                icon={Filter}
                displayMode="icon"
                showSelectedInDropdown={true}
            />
            {showControls && (
                <>
                    <button
                        onClick={selectAllFields}
                        className={buttonClasses}
                        title="Select All"
                    >
                        <CheckSquare size={16} />
                    </button>
                    <button
                        onClick={clearAllFields}
                        className={buttonClasses}
                        title="Clear"
                    >
                        <XSquare size={16} />
                    </button>
                </>
            )}
        </div>
    );
};

export default FieldSelectionControls;