'use client';

import React, {useState} from 'react';
import {Search, X} from 'lucide-react';

const FloatingLabelInput = (
    {
        label = "First Name",
        placeholder = "",
        type = "text",
        value = "",
        onChange = () => {
        }
    }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [inputValue, setInputValue] = useState(value);

    const handleChange = (e) => {
        setInputValue(e.target.value);
        onChange(e);
    };

    const clearInput = () => {
        setInputValue('');
        onChange({target: {value: ''}});
    };

    const hasValue = inputValue.length > 0;

    return (
        <div className="relative w-full">
            <div className="relative">
                <input
                    type={type}
                    value={inputValue}
                    onChange={handleChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="w-full px-4 py-3 bg-white border rounded-md outline-none transition-all duration-200 ease-in-out peer"
                />
                <label
                    className={`absolute left-2 transition-all duration-200 ease-in-out pointer-events-none
            ${(isFocused || hasValue)
              ? '-top-2 text-xs bg-white px-1 text-blue-600'
              : 'top-3 text-gray-500'
                    }`}
                >
                    {label}
                </label>

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {hasValue && (
                        <button
                            onClick={clearInput}
                            className="p-1 hover:text-blue-600 transition-colors"
                        >
                            <X size={16}/>
                        </button>
                    )}
                    <Search size={16} className="text-gray-400"/>
                </div>
            </div>
        </div>
    );
};

// Example usage component
const Example = () => {
    return (
        <div className="w-96 p-8 space-y-4">
            <FloatingLabelInput
                label="First Name"
                placeholder="Enter your first name"
            />
            <FloatingLabelInput
                label="Last Name"
                placeholder="Enter your last name"
            />
            <FloatingLabelInput
                label="Email"
                type="email"
                placeholder="Enter your email"
            />
        </div>
    );
};

export default FloatingLabelInput;
