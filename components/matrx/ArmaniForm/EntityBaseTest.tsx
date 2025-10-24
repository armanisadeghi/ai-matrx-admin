import React, {useCallback} from 'react';
import {EntityKeys} from "@/types/entityTypes";
import {MatrxVariant} from "@/components/matrx/ArmaniForm/field-components/types";

interface EntityStateField {
    name: string;
}

export interface EntityBaseFieldProps {
    entityKey: EntityKeys;
    dynamicFieldInfo: EntityStateField;
    value: any;
    onChange: (value: any) => void;
    density?: 'compact' | 'normal' | 'comfortable';
    animationPreset?: 'none' | 'subtle' | 'smooth' | 'energetic' | 'playful';
    size?: 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    variant?: MatrxVariant;
    floatingLabel?: boolean;
}

const EntityBaseField: React.FC<EntityBaseFieldProps> = (
    {
        value,
        onChange,
        dynamicFieldInfo,
    }) => {
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    }, [onChange]);

    return (
        <input
            type="text"
            value={value}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded border bg-textured text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={dynamicFieldInfo.name}
        />
    );
};

export default EntityBaseField;
