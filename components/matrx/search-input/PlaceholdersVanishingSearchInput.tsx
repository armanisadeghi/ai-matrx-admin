"use client";

import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";

interface PlaceholdersAndVanishInputProps {
  columnNames: string[];
  onSearchChange: (value: string) => void;
  className?: string;
  initialValue?: string;
}

export const PlaceholdersVanishingSearchInput: React.FC<
  PlaceholdersAndVanishInputProps
> = ({ columnNames, onSearchChange, className, initialValue }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  const placeholders = columnNames.map((name) => `Search ${name}...`);

  return (
    <PlaceholdersAndVanishInput
      placeholders={placeholders}
      onChange={handleChange}
      onSubmit={onSubmit}
      className={className}
      initialValue={initialValue}
    />
  );
};
