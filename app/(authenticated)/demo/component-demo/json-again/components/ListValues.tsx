// components/ListValues.tsx
import React from "react";

interface ListValuesProps {
    values: string[];
    onChange: (index: number, value: string) => void;
    onAdd: () => void;
}

export const ListValues: React.FC<ListValuesProps> = ({ values, onChange, onAdd }) => (
    <div className="ml-8 space-y-1 mt-1">
        {values.map((value, index) => (
            <input
                key={index}
                type="text"
                value={value}
                placeholder={`Value ${index + 1}`}
                onChange={(e) => onChange(index, e.target.value)}
                className="border border-gray-200 dark:border-gray-700 rounded px-2 py-1 
                  bg-textured text-gray-900 dark:text-gray-100
                  placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
        ))}
        <button onClick={onAdd} className="text-blue-500 text-sm hover:text-blue-600">
            + Add value
        </button>
    </div>
);
