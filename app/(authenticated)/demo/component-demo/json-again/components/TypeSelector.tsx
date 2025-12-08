// components/TypeSelector.tsx
import React from "react";
import { Row } from "../types";

interface TypeSelectorProps {
    type: Row["type"];
    onChange: (type: Row["type"]) => void;
}

export const TypeSelector: React.FC<TypeSelectorProps> = ({ type, onChange }) => (
    <select
        value={type || ""}
        onChange={(e) => onChange(e.target.value as Row["type"])}
        className="border-border rounded px-2 py-1 text-sm 
              bg-textured text-gray-900 dark:text-gray-100"
    >
        <option value="">Select type...</option>
        <option value="text">Text</option>
        <option value="number">Number</option>
        <option value="boolean">Yes/No</option>
        <option value="object">Group</option>
        <option value="array">List</option>
    </select>
);
