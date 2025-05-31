import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import React from "react";
import {FormDensity} from "@/components/matrx/ArmaniForm/ArmaniForm";
import {MatrxVariant} from "@/components/matrx/ArmaniForm/field-components/types";
import {AnimationPreset, ComponentSize} from "@/types/componentConfigTypes";
import { EntityKeys } from "@/types/entityTypes";

interface EntitySearchInputProps {
    entityKey: EntityKeys | null;
    fieldDisplayNames: Map<string, string>;
    allowedFields: string[];
    searchTerm: string;
    onSearchChange: (value: string) => void;
    density?: FormDensity;
    animationPreset?: AnimationPreset;
    size?: ComponentSize
    variant?: MatrxVariant;
    className?: string;
}

export const EntitySearchInput: React.FC<EntitySearchInputProps> = (
    {
        entityKey,
        fieldDisplayNames,
        allowedFields,
        searchTerm,
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
        console.log("Search submitted:", searchTerm);
    };

    const formatSearchPlaceholder = (displayName: string) => `Search ${displayName}...`;
    
    // Create placeholders from field display names
    const placeholders = React.useMemo(() => {
        if (!allowedFields.length) {
            return ['Search fields...'];
        }
        
        // Get up to 5 field display names for placeholders
        const sampleFields = allowedFields.slice(0, 5);
        return sampleFields.map(fieldName => {
            const displayName = fieldDisplayNames.get(fieldName) || fieldName;
            return formatSearchPlaceholder(displayName);
        });
    }, [allowedFields, fieldDisplayNames]);

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

