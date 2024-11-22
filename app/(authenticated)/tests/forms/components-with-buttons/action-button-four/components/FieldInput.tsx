// components/FieldInput.tsx
import React from 'react';

interface FieldInputProps {
    singleLine: boolean;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onFocus: () => void;
    onBlur: () => void;
}

const FieldInput: React.FC<FieldInputProps> = (
    {
        singleLine,
        value,
        onChange,
        onFocus,
        onBlur
    }) => {
    if (singleLine) {
        return (
            <input
                type="text"
                value={value}
                onChange={onChange}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="NULL"
                className="w-full h-full px-3 bg-transparent text-foreground focus:outline-none"
            />
        );
    }

    return (
        <textarea
            value={value}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder="NULL"
            className="w-full h-full min-h-[96px] p-3 bg-transparent text-foreground focus:outline-none resize-none"
        />
    );
};

export default FieldInput;
