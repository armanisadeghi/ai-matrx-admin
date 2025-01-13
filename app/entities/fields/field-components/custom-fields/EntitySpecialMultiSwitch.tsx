import React from 'react';
import MultiSwitchToggle from "@/components/matrx/MultiSwitchToggle";
import * as LucideIcons from 'lucide-react';
import {
    MessageSquare,
    Braces,
    Image,
    DatabaseZap,
    Volume2,
    Video,
    Files,
} from 'lucide-react';

// Preset configurations
const PRESET_CONFIGURATIONS = {
    RESPONSE_FORMATS: [
        { iconName: 'MessageSquare', label: "Text", value: "text" },
        { iconName: 'Braces', label: "JSON", value: "json" },
        { iconName: 'DatabaseZap', label: "Schema", value: "schema" },
        { iconName: 'Image', label: "Image", value: "image" },
        { iconName: 'Volume2', label: "Audio", value: "audio" },
        { iconName: 'Video', label: "Video", value: "video" },
        { iconName: 'Files', label: "Multi", value: "multi" },
    ],
    // Add other preset configurations here
} as const;

// Local configurations for direct JSX icon usage
const LOCAL_CONFIGURATIONS = {
    RESPONSE_FORMATS: [
        { icon: <MessageSquare size={14} />, label: "Text", value: "text" },
        { icon: <Braces size={14} />, label: "JSON", value: "json" },
        { icon: <DatabaseZap size={14} />, label: "Schema", value: "schema" },
        { icon: <Image size={14} />, label: "Image", value: "image" },
        { icon: <Volume2 size={14} />, label: "Audio", value: "audio" },
        { icon: <Video size={14} />, label: "Video", value: "video" },
        { icon: <Files size={14} />, label: "Multi", value: "multi" },
    ],
    // Add other local configurations here
} as const;

interface EntitySpecialMultiSwitchProps {
    value: string | number;
    onChange: (value: string | number) => void;
    disabled?: boolean;
    className?: string;
    dynamicFieldInfo: any;
    ref?: React.Ref<any>;
}

const EntitySpecialMultiSwitch = React.forwardRef<HTMLElement, EntitySpecialMultiSwitchProps>(
    ({ value, onChange, disabled, className, dynamicFieldInfo }, ref) => {
        const componentProps = dynamicFieldInfo?.componentProps || {};
        
        // Extract configuration with fallbacks
        const variant = componentProps?.variant || "geometric";
        const width = componentProps?.width || "w-48";  // Updated default width
        const height = componentProps?.height || "h-7";
        
        // Handle states with configuration preferences
        const states = (() => {
            // Check for preset configuration
            if (componentProps?.preset && PRESET_CONFIGURATIONS[componentProps.preset]) {
                return PRESET_CONFIGURATIONS[componentProps.preset].map(state => ({
                    ...state,
                    icon: state.iconName ? React.createElement(LucideIcons[state.iconName], { size: 14 }) : null
                }));
            }

            // Handle custom states from componentProps
            if (Array.isArray(componentProps?.states)) {
                return componentProps.states.map(state => {
                    if (state.iconName && LucideIcons[state.iconName]) {
                        // Create element from Lucide icon
                        return {
                            ...state,
                            icon: React.createElement(LucideIcons[state.iconName], { size: 14 })
                        };
                    }
                    return state;
                });
            }

            // Default to a simple set of states if nothing else is provided
            return [
                { label: 'Option 1', value: 'option1' },
                { label: 'Option 2', value: 'option2' },
                { label: 'Option 3', value: 'option3' }
            ];
        })();

        // Use defaultValue from dynamicFieldInfo if value is undefined
        const effectiveValue = value ?? dynamicFieldInfo?.defaultValue ?? states[0]?.value;

        return (
            <div className="w-full space-y-2">
                <span className="text-sm">{dynamicFieldInfo.displayName}</span>
                <MultiSwitchToggle
                    ref={ref}
                    variant={variant}
                    width={width}
                    height={height}
                    disabled={disabled}
                    value={effectiveValue}
                    onChange={onChange}
                    states={states}
                    className={className}
                />
            </div>
        );
    }
);

EntitySpecialMultiSwitch.displayName = 'EntitySpecialMultiSwitch';

export default React.memo(EntitySpecialMultiSwitch);
