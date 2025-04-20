import React from 'react';
import { Bold, Italic, Underline, Type, Palette } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToolbarDivider } from '@/components/ui/StableButton';
import { ChipButtons } from './ChipButtons';
import { TextStyle } from '@/types/editor.types';
import { ButtonWithTooltip } from './ButtonWithTooltip';

export interface ToolbarConfig {
    colors: {
        text: { label: string; value: string }[];
        background: { label: string; value: string }[];
    };
    fontSizes: { label: string; value: string }[];
}

export const TOOLBAR_CONFIG: ToolbarConfig = {
    colors: {
        text: [
            { label: 'Default', value: 'inherit' },
            { label: 'Gray', value: '#6B7280' },
            { label: 'Red', value: '#EF4444' },
            { label: 'Blue', value: '#3B82F6' },
            { label: 'Green', value: '#10B981' },
        ],
        background: [
            { label: 'None', value: 'transparent' },
            { label: 'Gray', value: '#F3F4F6' },
            { label: 'Red', value: '#FEE2E2' },
            { label: 'Blue', value: '#DBEAFE' },
            { label: 'Green', value: '#D1FAE5' },
        ],
    },
    fontSizes: [
        { label: 'Small', value: '1' },
        { label: 'Normal', value: '2' },
        { label: 'Large', value: '3' },
        { label: 'Larger', value: '4' },
        { label: 'XL', value: '5' },
    ],
};

interface ToolbarProps {
    onApplyStyle: (style: TextStyle) => void;
    onInsertChip: () => void;
    onConvertToChip: () => void;
}

const Toolbar = ({ onApplyStyle, onInsertChip, onConvertToChip }: ToolbarProps) => {
    // Simple direct handlers - no memoization
    const handleBoldClick = () => onApplyStyle({ command: 'bold' });
    const handleItalicClick = () => onApplyStyle({ command: 'italic' });
    const handleUnderlineClick = () => onApplyStyle({ command: 'underline' });
    
    // Direct handlers for select changes
    const handleFontSizeChange = (value: string) => onApplyStyle({ command: 'fontSize', value });
    const handleTextColorChange = (value: string) => onApplyStyle({ command: 'foreColor', value });
    const handleBgColorChange = (value: string) => onApplyStyle({ command: 'hiliteColor', value });

    return (
        <div className='flex items-center gap-2 p-2 border-b border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900'>
            {/* Basic Formatting */}
            <div className='flex items-center gap-1'>
                <ButtonWithTooltip
                    onClick={handleBoldClick}
                    tooltipText='Bold'
                >
                    <Bold size={16} />
                </ButtonWithTooltip>
                <ButtonWithTooltip
                    onClick={handleItalicClick}
                    tooltipText='Italic'
                >
                    <Italic size={16} />
                </ButtonWithTooltip>
                <ButtonWithTooltip
                    onClick={handleUnderlineClick}
                    tooltipText='Underline'
                >
                    <Underline size={16} />
                </ButtonWithTooltip>
            </div>
            <ToolbarDivider />
            
            {/* Font Size */}
            <div className='flex items-center gap-1'>
                <Type size={16} className='text-neutral-950 dark:text-neutral-50' />
                <Select onValueChange={handleFontSizeChange}>
                    <SelectTrigger className='h-8 w-24 bg-transparent dark:bg-neutral-800'>
                        <SelectValue placeholder='Size' />
                    </SelectTrigger>
                    <SelectContent>
                        {TOOLBAR_CONFIG.fontSizes.map((size) => (
                            <SelectItem key={size.value} value={size.value}>
                                {size.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <ToolbarDivider />
            
            {/* Colors */}
            <div className='flex items-center gap-2'>
                {/* Text Color */}
                <div className='flex items-center gap-1'>
                    <Palette size={16} className='text-neutral-950 dark:text-neutral-50' />
                    <Select onValueChange={handleTextColorChange}>
                        <SelectTrigger className='h-8 w-24 bg-transparent dark:bg-neutral-800'>
                            <SelectValue placeholder='Color' />
                        </SelectTrigger>
                        <SelectContent>
                            {TOOLBAR_CONFIG.colors.text.map((color) => (
                                <SelectItem key={color.value} value={color.value}>
                                    {color.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                {/* Background Color */}
                <div className='flex items-center gap-1'>
                    <Palette size={16} className='text-neutral-950 dark:text-neutral-50' />
                    <Select onValueChange={handleBgColorChange}>
                        <SelectTrigger className='h-8 w-24 bg-transparent dark:bg-neutral-800'>
                            <SelectValue placeholder='Background' />
                        </SelectTrigger>
                        <SelectContent>
                            {TOOLBAR_CONFIG.colors.background.map((color) => (
                                <SelectItem key={color.value} value={color.value}>
                                    {color.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <ToolbarDivider />
            
            {/* Chip Operations */}
            <ChipButtons
                onInsertChip={onInsertChip}
                onConvertToChip={onConvertToChip}
            />
        </div>
    );
};

export default Toolbar;