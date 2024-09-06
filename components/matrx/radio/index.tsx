// File Location: components/matrx/radio/index.tsx

import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface MatrxRadioGroupProps {
    options: { value: string; label: string }[];
    value: string;
    onValueChange: (value: string) => void;
    className?: string;
}

export const MatrxRadioGroup: React.FC<MatrxRadioGroupProps> = ({ options, value, onValueChange, className }) => (
    <RadioGroup
        value={value}
        onValueChange={onValueChange}
        className={`mb-4 flex space-x-2 ${className}`}
    >
        {options.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={option.value} />
                <Label htmlFor={option.value} className="text-foreground">{option.label}</Label>
            </div>
        ))}
    </RadioGroup>
);
