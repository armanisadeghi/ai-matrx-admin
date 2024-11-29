import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import React from "react";
import {EntityStateField} from "@/lib/redux/entity/types/stateTypes";
import {AnimationPreset, FormDensity} from "@/components/matrx/ArmaniForm/ArmaniForm";
import {MatrxVariant} from "@/components/matrx/ArmaniForm/field-components/types";

interface EntitySearchInputProps {
    dynamicFieldInfo: EntityStateField[];
    onSearchChange: (value: string) => void;
    density?: FormDensity;
    animationPreset?: AnimationPreset;
    size?: 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    variant?: MatrxVariant;
    className?: string;
}

export const EntitySearchInput: React.FC<EntitySearchInputProps> = (
    {
        dynamicFieldInfo,
        onSearchChange,
        density,
        animationPreset,
        size,
        variant,
        className,
    }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSearchChange(e.target.value);
    };

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log("submitted");
    };

    const placeholders = dynamicFieldInfo.map((displayName) => `Search ${displayName}...`);

    return (
        <PlaceholdersAndVanishInput
            placeholders={placeholders}
            onChange={handleChange}
            onSubmit={onSubmit}
            className={className}
        />
    );
};

export default EntitySearchInput;

