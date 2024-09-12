"use client";

import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";

interface PlaceholdersAndVanishInputProps {
    columnNames: string[];
    onSearchChange: (value: string) => void;
    className?: string; // Add this line
}

export const PlaceholdersVanishingSearchInput: React.FC<PlaceholdersAndVanishInputProps> = (
    {
        columnNames,
        onSearchChange,
        className, // Add this line
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
            className={className} // Add this line
        />
    );
};
