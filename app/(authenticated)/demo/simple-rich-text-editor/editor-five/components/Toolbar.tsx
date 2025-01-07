// Toolbar.tsx
import React from 'react';
import {
    Bold,
    Italic,
    Underline,
    Type,
    Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChipButtons } from './ChipButtons';
import { ToolbarProps, TextStyle, ToolbarConfig } from '../types';

const TOOLBAR_CONFIG: ToolbarConfig = {
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

const ToolbarButton: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
}> = ({ onClick, icon, title }) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClick}
                    className="h-8 w-8 p-0 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                    <span className="w-4 h-4 text-neutral-950 dark:text-neutral-50">{icon}</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent>{title}</TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

const ToolbarDivider: React.FC = () => (
    <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-600" />
);

const Toolbar: React.FC<ToolbarProps> = ({ onApplyStyle, onInsertChip, onConvertToChip }) => {
    const handleStyleChange = (style: TextStyle) => {
        onApplyStyle(style);
    };

    return (
        <div className="flex items-center gap-2 p-2 border-b border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900">
            {/* Basic Formatting */}
            <div className="flex items-center gap-1">
                <ToolbarButton
                    onClick={() => handleStyleChange({ command: 'bold' })}
                    icon={<Bold size={16} />}
                    title="Bold"
                />
                <ToolbarButton
                    onClick={() => handleStyleChange({ command: 'italic' })}
                    icon={<Italic size={16} />}
                    title="Italic"
                />
                <ToolbarButton
                    onClick={() => handleStyleChange({ command: 'underline' })}
                    icon={<Underline size={16} />}
                    title="Underline"
                />
            </div>

            <ToolbarDivider />

            {/* Font Size */}
            <div className="flex items-center gap-1">
                <Type size={16} className="text-neutral-950 dark:text-neutral-50" />
                <Select
                    onValueChange={(value) =>
                        handleStyleChange({
                            command: 'fontSize',
                            value,
                        })
                    }
                >
                    <SelectTrigger className="h-8 w-24 bg-transparent dark:bg-neutral-800">
                        <SelectValue placeholder="Size" />
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
            <div className="flex items-center gap-2">
                {/* Text Color */}
                <div className="flex items-center gap-1">
                    <Palette size={16} className="text-neutral-950 dark:text-neutral-50" />
                    <Select
                        onValueChange={(value) =>
                            handleStyleChange({
                                command: 'foreColor',
                                value,
                            })
                        }
                    >
                        <SelectTrigger className="h-8 w-24 bg-transparent dark:bg-neutral-800">
                            <SelectValue placeholder="Color" />
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
                <div className="flex items-center gap-1">
                    <Palette size={16} className="text-neutral-950 dark:text-neutral-50" />
                    <Select
                        onValueChange={(value) =>
                            handleStyleChange({
                                command: 'hiliteColor',
                                value,
                            })
                        }
                    >
                        <SelectTrigger className="h-8 w-24 bg-transparent dark:bg-neutral-800">
                            <SelectValue placeholder="Background" />
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
