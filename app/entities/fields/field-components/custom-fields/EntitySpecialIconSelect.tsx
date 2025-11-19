import React from 'react';
import SelectWithIconDisplay from '@/components/matrx/SelectWithIconDisplay';
import { getIconComponent } from '@/components/official/IconResolver';

// Preset configurations for common use cases
const PRESET_CONFIGURATIONS = {
    AI_TOOLS: [
        { iconName: 'Search', label: 'Web Search', value: 'web-search' },
        { iconName: 'Code', label: 'Code Execution', value: 'code-exec' },
        { iconName: 'FileSearch', label: 'File Search', value: 'file-search' },
        { iconName: 'Image', label: 'Image Generation', value: 'image-gen' },
        { iconName: 'Cloud', label: 'Weather', value: 'weather' },
        { iconName: 'Newspaper', label: 'News', value: 'news' },
        { iconName: 'Calendar', label: 'Calendar', value: 'calendar' },
        { iconName: 'ListTodo', label: 'Tasks', value: 'tasks' },
        { iconName: 'Mail', label: 'Email', value: 'email' },
        { iconName: 'MessageSquare', label: 'Chat', value: 'chat' },
        { iconName: 'Calculator', label: 'Calculator', value: 'calculator' },
        { iconName: 'Globe2', label: 'Translation', value: 'translation' },
        { iconName: 'Database', label: 'Knowledge Base', value: 'knowledge-base' },
        { iconName: 'Bot', label: 'AI Assistant', value: 'ai-assistant' },
        { iconName: 'FileSearch', label: 'Document Analysis', value: 'doc-analysis' }
    ],
    // Add other preset configurations as needed
} as const;

interface EntitySpecialIconSelectProps {
    value: any;
    onChange: (value: any) => void;
    disabled?: boolean;
    className?: string;
    dynamicFieldInfo: any;
    ref?: React.Ref<any>;
}

const EntitySpecialIconSelect = React.forwardRef<HTMLElement, EntitySpecialIconSelectProps>(
    ({ value, onChange, disabled, className, dynamicFieldInfo }, ref) => {
        const componentProps = dynamicFieldInfo?.componentProps || {};
        
        const placeholder = componentProps?.placeholder || "Select items...";
        const maxHeight = componentProps?.maxHeight || "max-h-60";
        
        // Handle items with configuration preferences
        const items = (() => {
            // Check for preset configuration
            if (componentProps?.preset && PRESET_CONFIGURATIONS[componentProps.preset]) {
                return PRESET_CONFIGURATIONS[componentProps.preset].map(item => ({
                    ...item,
                    icon: item.iconName ? React.createElement(getIconComponent(item.iconName), { size: 16 }) : null
                }));
            }

            // Handle custom items from componentProps
            if (Array.isArray(componentProps?.items)) {
                return componentProps.items.map(item => {
                    // Handle items with iconName (string reference to Lucide icon)
                    if (item.iconName) {
                        return {
                            ...item,
                            icon: React.createElement(getIconComponent(item.iconName), { size: 16 })
                        };
                    }
                    // Handle items with direct icon component
                    if (item.icon) {
                        return item;
                    }
                    // Handle items without icons
                    return {
                        ...item,
                        icon: null
                    };
                });
            }

            // Default items if nothing is provided
            return [
                { icon: null, label: 'Option 1', value: 'option1' },
                { icon: null, label: 'Option 2', value: 'option2' }
            ];
        })();

        // Handle value conversion and defaults
        const effectiveValue = (() => {
            if (!value && dynamicFieldInfo?.defaultValue) {
                const defaultVal = dynamicFieldInfo.defaultValue;
                if (Array.isArray(defaultVal)) {
                    return defaultVal
                        .map(val => items.find(item => item.value === val))
                        .filter(Boolean);
                }
                const defaultItem = items.find(item => item.value === defaultVal);
                return defaultItem ? [defaultItem] : [];
            }
            return Array.isArray(value) ? value : [];
        })();

        return (
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <SelectWithIconDisplay
                        ref={ref}
                        items={items}
                        value={effectiveValue}
                        onChange={onChange}
                        placeholder={placeholder}
                        maxHeight={maxHeight}
                        className={className}
                        disabled={disabled}
                    />
                </div>
            </div>
        );
    }
);

EntitySpecialIconSelect.displayName = 'EntitySpecialIconSelect';

export default React.memo(EntitySpecialIconSelect);