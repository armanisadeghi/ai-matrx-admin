'use client';

import React, {useState} from 'react';
import {colord, Colord} from 'colord';
import {HexColorPicker} from 'react-colorful';
import {Card} from '@/components/ui/card';
import {cn} from "@/lib/utils";
import { MatrxVariant } from './types';

interface ColorPickerProps {
    color?: Colord;
    onChange?: (color: Colord) => void;
    variant?: MatrxVariant;
    className?: string;
}

const colorPickerVariants = {
    default: "bg-background border-border",
    destructive: "bg-background border-destructive",
    outline: "bg-transparent border-2",
    secondary: "bg-secondary",
    ghost: "bg-transparent border-transparent",
    link: "bg-background border-border",
    primary: "bg-primary border-primary"
}

export default function EntityColorPicker({
                                              color,
                                              onChange,
                                              variant = "default",
                                              className
                                          }: ColorPickerProps) {
    const [internalColor, setInternalColor] = useState<Colord>(color || colord('#ff0000'));

    const handleChange = (hex: string) => {
        const newColor = colord(hex);

        if (!onChange) {
            setInternalColor(newColor);
        }

        if (onChange) {
            onChange(newColor);
        }
    };

    return (
        <div className={cn(colorPickerVariants[variant], className)}>
            <HexColorPicker
                color={(color || internalColor).toHex()}
                onChange={handleChange}
            />
        </div>
    );
}

const predefinedColors = [
    '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF', '#FF00FF',
    '#000000', '#808080', '#FFFFFF', '#800000', '#808000', '#008000', '#800080', '#008080', '#000080'
];
