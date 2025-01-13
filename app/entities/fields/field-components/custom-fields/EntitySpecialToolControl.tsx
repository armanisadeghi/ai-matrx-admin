import React from 'react';
import MultiSwitchToggle from '@/components/matrx/MultiSwitchToggle';
import SelectWithIconDisplay from '@/components/matrx/SelectWithIconDisplay';
import {
    MessageSquare, Braces, Image, DatabaseZap, Volume2,
    Video, Files, Search, Code, FileSearch, Cloud,
    Newspaper, Calendar, ListTodo, Mail, Calculator,
    Globe2, Database, Bot, Settings, Music, Book,
} from 'lucide-react';

// Predefined configurations
export const TOOL_CONTROL_PRESETS = {
    toolAssistOptions: [
        { label: 'Off', value: 'toolsOff' },
        { label: 'Tools', value: 'tools' },
        { label: 'Tool Assist', value: 'toolAssist' },
    ],
    
    aiTools: [
        { icon: Search, label: 'Web Search', value: 'web-search' },
        { icon: Code, label: 'Code Execution', value: 'code-exec' },
        { icon: FileSearch, label: 'File Search', value: 'file-search' },
        { icon: Image, label: 'Image Generation', value: 'image-gen' },
        { icon: Cloud, label: 'Weather', value: 'weather' },
        { icon: Newspaper, label: 'News', value: 'news' },
        { icon: Calendar, label: 'Calendar', value: 'calendar' },
        { icon: ListTodo, label: 'Tasks', value: 'tasks' },
        { icon: Mail, label: 'Email', value: 'email' },
        { icon: MessageSquare, label: 'Chat', value: 'chat' },
        { icon: Calculator, label: 'Calculator', value: 'calculator' },
        { icon: Globe2, label: 'Translation', value: 'translation' },
        { icon: Database, label: 'Knowledge Base', value: 'knowledge-base' },
        { icon: Bot, label: 'AI Assistant', value: 'ai-assistant' },
        { icon: FileSearch, label: 'Document Analysis', value: 'doc-analysis' },
    ],
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

        // Get configurations from presets using string names
        const primaryControlOptions = (() => {
            const presetName = componentProps?.primaryControlOptions;
            if (typeof presetName === 'string' && presetName in TOOL_CONTROL_PRESETS) {
                return TOOL_CONTROL_PRESETS[presetName];
            }
            return TOOL_CONTROL_PRESETS.toolAssistOptions; // Default
        })();

        const toolOptions = (() => {
            const presetName = componentProps?.toolOptions;
            if (typeof presetName === 'string' && presetName in TOOL_CONTROL_PRESETS) {
                return TOOL_CONTROL_PRESETS[presetName];
            }
            return []; // Default to empty if not found
        })();

        // Initialize or use existing value
        const currentValue = value || {
            primaryOption: primaryControlOptions[0]?.value,
            ...Object.fromEntries(toolOptions.map((tool) => [tool.value, false])),
        };

        // Check if tools should be disabled
        const isToolsDisabled = disabled || isOffValue(currentValue.primaryOption);

        // Handle primary option change
        const handlePrimaryOptionChange = (newPrimaryOption: string) => {
            const newValue = {
                ...currentValue,
                primaryOption: newPrimaryOption,
            };

            // Clear tool selections if switching to off
            if (isOffValue(newPrimaryOption)) {
                toolOptions.forEach(tool => {
                    newValue[tool.value] = false;
                });
            }

            onChange(newValue);
        };

        // Handle tools selection change
        const handleToolsChange = (selectedTools: Array<any>) => {
            if (isToolsDisabled) return; // Prevent changes if disabled

            const newToolState = Object.fromEntries(toolOptions.map((tool) => [tool.value, false]));
            selectedTools.forEach((tool) => {
                newToolState[tool.value] = true;
            });

            onChange({
                ...currentValue,
                ...newToolState,
            });
        };

        // Convert current boolean tool states back to array for SelectWithIconDisplay
        const selectedTools = toolOptions.filter((tool) => currentValue[tool.value]);

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
                            disabled={isToolsDisabled}
                        />
                    </div>
                </div>
            </div>
        );
    }
);

EntitySpecialToolControl.displayName = 'EntitySpecialToolControl';

export default React.memo(EntitySpecialToolControl);
