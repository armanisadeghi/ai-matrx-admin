import React from 'react';
import { Input } from "@/components/ui/input";
import { FieldComponentProps } from '../../types';
import EntitySpecialSwitch from './EntitySpecialSwitch';
import EntitySpecialSlider from './EntitySpecialSlider';
import EntitySpecialMultiSwitch from './EntitySpecialMultiSwitch';
import EntitySpecialIconSelect from './EntitySpecialIconSelect';
import EntitySpecialToolControl from './EntitySpecialToolControl';
import EntitySpecialRelatedRecord from './EntitySpecialRelatedRecord';

// Simple fallback input component
const FallbackInput = React.forwardRef<HTMLInputElement, any>((props, ref) => {
    const { value, onChange, disabled, dynamicFieldInfo } = props;
    
    return (
        <Input
            ref={ref}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={dynamicFieldInfo.displayName}
        />
    );
});

FallbackInput.displayName = 'FallbackInput';

// Mapping of special sub-components
export const ENTITY_SPECIAL_SUB_COMPONENTS = {
    SWITCH: EntitySpecialSwitch,
    SLIDER: EntitySpecialSlider,
    MULTI_SWITCH: EntitySpecialMultiSwitch,
    ICON_SELECT: EntitySpecialIconSelect,
    TOOL_CONTROL: EntitySpecialToolControl,
    RELATED_RECORD: EntitySpecialRelatedRecord,
    FALLBACK: FallbackInput,
} as const;

const EntitySpecialField = React.forwardRef<HTMLDivElement, FieldComponentProps>(
    (
        {
            entityKey,
            dynamicFieldInfo,
            value,
            onChange,
            disabled,
            className,
            density,
            animationPreset,
            size,
            textSize,
            variant,
            floatingLabel,
        },
        ref
    ) => {
        const subComponentName = dynamicFieldInfo.componentProps?.subComponent;
        const SubComponent = ENTITY_SPECIAL_SUB_COMPONENTS[subComponentName] || FallbackInput;

        return (
            <SubComponent
                ref={ref}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={className}
                dynamicFieldInfo={dynamicFieldInfo}
            />
        );
    }
);

EntitySpecialField.displayName = 'EntitySpecialField';

export default React.memo(EntitySpecialField);