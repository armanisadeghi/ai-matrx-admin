import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ColorOption } from '../types';

interface ColorSelectionProps {
    options: ColorOption[];
    selectedColor: string;
    onChange: (color: string) => void;
}

const ColorSelection: React.FC<ColorSelectionProps> = ({
    options,
    selectedColor,
    onChange
}) => {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
            <RadioGroup
                value={selectedColor}
                onValueChange={onChange}
                className="grid grid-cols-5 gap-2"
            >
                {options.map((option) => (
                    <div key={option.color} className="flex items-center space-x-2">
                        <RadioGroupItem
                            value={option.color}
                            id={option.color}
                            className="sr-only"
                        />
                        <Label
                            htmlFor={option.color}
                            className={`
                                w-full h-8 rounded-md cursor-pointer
                                flex items-center justify-center
                                ${option.className}
                                ${selectedColor === option.color ? 'ring-2 ring-offset-2 ring-neutral-950 dark:ring-neutral-50' : ''}
                            `}
                        >
                            {selectedColor === option.color && (
                                <span className="w-2 h-2 rounded-full bg-current" />
                            )}
                        </Label>
                    </div>
                ))}
            </RadioGroup>
        </div>
    );
};

export default ColorSelection;