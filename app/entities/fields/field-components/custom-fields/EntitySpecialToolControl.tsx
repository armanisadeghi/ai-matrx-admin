import React, { useEffect } from 'react';
import MultiSwitchToggle from '@/components/matrx/MultiSwitchToggle';
import SelectWithIconDisplay from '@/components/matrx/SelectWithIconDisplay';
import { useTools } from '@/hooks/useTools';

interface Tool {
    id: string;
    name: string;
    description: string;
    category: string;
    icon: React.ReactNode;
}

// Predefined configurations
export const TOOL_CONTROL_PRESETS = {
    toolAssistOptions: [
        { label: 'Off', value: 'toolsOff' },
        { label: 'Tools', value: 'tools' },
        { label: 'Tool Assist', value: 'toolAssist' },
    ],
    
    // aiTools will be fetched from database via useTools hook
    // Add more preset configurations as needed
} as const;

const isOffValue = (value: string | number): boolean => {
    if (typeof value !== 'string') return false;
    const offValues = ['off', 'no', 'false', 'none', 'toolsoff', 'disabled'];
    return offValues.includes(value.toLowerCase());
};

interface EntitySpecialToolControlProps {
    value: any;
    onChange: (value: any) => void;
    disabled?: boolean;
    className?: string;
    dynamicFieldInfo: any;
}

const EntitySpecialToolControl = React.forwardRef<HTMLDivElement, EntitySpecialToolControlProps>(
    ({ value, onChange, disabled, className, dynamicFieldInfo }, ref) => {
        const componentProps = dynamicFieldInfo?.componentProps || {};
        
        // Fetch tools from database
        const { tools, isLoading, error } = useTools({ autoFetch: true });
        
        // Get configurations from presets using string names
        const primaryControlOptions = (() => {
            const presetName = componentProps?.primaryControlOptions;
            if (typeof presetName === 'string' && presetName in TOOL_CONTROL_PRESETS) {
                return TOOL_CONTROL_PRESETS[presetName];
            }
            return TOOL_CONTROL_PRESETS.toolAssistOptions; // Default
        })();

        // Map database tools to the format expected by SelectWithIconDisplay
        const toolOptions = tools.map(tool => ({
            icon: tool.icon,
            label: tool.displayName,  // Use displayName for the label
            value: tool.id,           // Use id (which is the tool identifier) for the value
            id: tool.id,
        }));

        // Initialize or use existing value
        const currentValue = value || {
            primaryOption: primaryControlOptions[0]?.value,
            selectedToolIds: [], // Only store the IDs
        };

        // Check if tools should be disabled
        const isToolsDisabled = disabled || isOffValue(currentValue.primaryOption);

        // Handle primary option change
        const handlePrimaryOptionChange = (newPrimaryOption: string) => {
            // Only update primary option and clear selectedToolIds if needed
            const newValue = {
                primaryOption: newPrimaryOption,
                selectedToolIds: isOffValue(newPrimaryOption) ? [] : currentValue.selectedToolIds,
            };
            
            onChange(newValue);
        };

        // Handle tools selection change
        const handleToolsChange = (selectedTools: Array<any>) => {
            if (isToolsDisabled) return; // Prevent changes if disabled
            
            // Only update the selectedToolIds array
            const selectedToolIds = selectedTools.map(tool => tool.value);
            
            onChange({
                primaryOption: currentValue.primaryOption,
                selectedToolIds,
            });
        };

        // Get the selected tools by matching IDs
        const selectedTools = toolOptions.filter((tool) => 
            currentValue.selectedToolIds && currentValue.selectedToolIds.includes(tool.value)
        );

        // Show loading state
        if (isLoading) {
            return (
                <div ref={ref} className={`space-y-4 ${className}`}>
                    <div className="w-full space-y-2">
                        <span className="text-sm">{dynamicFieldInfo.displayName}</span>
                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span>Loading tools...</span>
                        </div>
                    </div>
                </div>
            );
        }

        // Show error state
        if (error) {
            return (
                <div ref={ref} className={`space-y-4 ${className}`}>
                    <div className="w-full space-y-2">
                        <span className="text-sm">{dynamicFieldInfo.displayName}</span>
                        <div className="text-sm text-red-600 dark:text-red-400">
                            Error loading tools: {error}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div ref={ref} className={`space-y-4 ${className}`}>
                <div className="w-full space-y-2">
                    <span className="text-sm">{dynamicFieldInfo.displayName}</span>
                    <MultiSwitchToggle
                        variant="geometric"
                        width="w-48"
                        height="h-7"
                        disabled={disabled}
                        value={currentValue.primaryOption}
                        onChange={handlePrimaryOptionChange}
                        states={primaryControlOptions}
                    />
                </div>
                
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <SelectWithIconDisplay
                            items={toolOptions}
                            value={selectedTools}
                            onChange={handleToolsChange}
                            placeholder="Select tools..."
                            disabled={isToolsDisabled || toolOptions.length === 0}
                        />
                    </div>
                </div>
                
                {/* Optional: Display the selected tool IDs for debugging */}
                {/*
                <div className="mt-2 text-xs text-gray-500">
                    Selected Tool IDs: {JSON.stringify(currentValue.selectedToolIds || [])}
                </div>
                */}
            </div>
        );
    }
);

EntitySpecialToolControl.displayName = 'EntitySpecialToolControl';
export default React.memo(EntitySpecialToolControl);