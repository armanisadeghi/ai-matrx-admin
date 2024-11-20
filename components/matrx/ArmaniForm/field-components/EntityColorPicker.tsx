'use client';

import React, {useState} from 'react';
import {colord, Colord} from 'colord';
import {HexColorPicker} from 'react-colorful';
import {Card} from '@/components/ui/card';

interface ColorPickerProps {
    color?: Colord;
    onChange?: (color: Colord) => void;
}

export default function EntityColorPicker({color, onChange}: ColorPickerProps) {
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
        <HexColorPicker color={(color || internalColor).toHex()} onChange={handleChange}/>
    );
}


const predefinedColors = [
    '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF', '#FF00FF',
    '#000000', '#808080', '#FFFFFF', '#800000', '#808000', '#008000', '#800080', '#008080', '#000080'
];


