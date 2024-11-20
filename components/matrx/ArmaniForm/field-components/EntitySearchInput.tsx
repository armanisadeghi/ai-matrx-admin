"use client";

import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";

interface EntitySearchInputProps {
    columnNames: string[];
    onSearchChange: (value: string) => void;
    className?: string;
}

export const EntitySearchInput: React.FC<EntitySearchInputProps> = (
    {
        columnNames,
        onSearchChange,
        className,
    }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSearchChange(e.target.value);
    };

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log("submitted");
    };

    const placeholders = columnNames.map((name) => `Search ${name}...`);

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

