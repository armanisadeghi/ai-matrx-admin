// Modified Toolbar.tsx - Import the memoized ToolbarButton
import React, { useMemo } from 'react';
import { Bold, Italic, Underline, Type, Palette } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToolbarButton, ToolbarDivider } from '@/components/ui/StableButton';
import { ChipButtons } from './ChipButtons';
import { TextStyle } from '@/types/editor.types';
import { useEditorContext } from '@/providers/rich-text-editor/Provider';

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
    editorId: string;
    onApplyStyle: (style: TextStyle) => void;
    onInsertChip: () => void;
    onConvertToChip: () => void;
}

const Toolbar = React.memo(({ editorId, onApplyStyle, onInsertChip, onConvertToChip }: ToolbarProps) => {
    const context = useEditorContext();
    const editorState = context.getEditorState(editorId);

    // Memoize the style change handler to prevent recreation on each render
    const handleStyleChange = useMemo(() => (style: TextStyle) => {
        onApplyStyle(style);
    }, [onApplyStyle]);

    // Memoize button event handlers
    const handleBoldClick = useMemo(() => () => handleStyleChange({ command: 'bold' }), [handleStyleChange]);
    const handleItalicClick = useMemo(() => () => handleStyleChange({ command: 'italic' }), [handleStyleChange]);
    const handleUnderlineClick = useMemo(() => () => handleStyleChange({ command: 'underline' }), [handleStyleChange]);

    // Memoize the SelectContent components
    const fontSizeItems = useMemo(() => (
        TOOLBAR_CONFIG.fontSizes.map((size) => (
            <SelectItem key={size.value} value={size.value}>
                {size.label}
            </SelectItem>
        ))
    ), []);

    const textColorItems = useMemo(() => (
        TOOLBAR_CONFIG.colors.text.map((color) => (
            <SelectItem key={color.value} value={color.value}>
                {color.label}
            </SelectItem>
        ))
    ), []);

    const bgColorItems = useMemo(() => (
        TOOLBAR_CONFIG.colors.background.map((color) => (
            <SelectItem key={color.value} value={color.value}>
                {color.label}
            </SelectItem>
        ))
    ), []);

    // Memoize the select change handlers
    const handleFontSizeChange = useMemo(() => (value: string) => {
        handleStyleChange({ command: 'fontSize', value });
    }, [handleStyleChange]);

    const handleTextColorChange = useMemo(() => (value: string) => {
        handleStyleChange({ command: 'foreColor', value });
    }, [handleStyleChange]);

    const handleBgColorChange = useMemo(() => (value: string) => {
        handleStyleChange({ command: 'hiliteColor', value });
    }, [handleStyleChange]);

    return (
        <div className='flex items-center gap-2 p-2 border-b border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900'>
            {/* Basic Formatting */}
            <div className='flex items-center gap-1'>
                <ToolbarButton
                    onClick={handleBoldClick}
                    icon={<Bold size={16} />}
                    title='Bold'
                />
                <ToolbarButton
                    onClick={handleItalicClick}
                    icon={<Italic size={16} />}
                    title='Italic'
                />
                <ToolbarButton
                    onClick={handleUnderlineClick}
                    icon={<Underline size={16} />}
                    title='Underline'
                />
            </div>

            <ToolbarDivider />

            {/* Font Size */}
            <div className='flex items-center gap-1'>
                <Type
                    size={16}
                    className='text-neutral-950 dark:text-neutral-50'
                />
                <Select onValueChange={handleFontSizeChange}>
                    <SelectTrigger className='h-8 w-24 bg-transparent dark:bg-neutral-800'>
                        <SelectValue placeholder='Size' />
                    </SelectTrigger>
                    <SelectContent>
                        {fontSizeItems}
                    </SelectContent>
                </Select>
            </div>

            <ToolbarDivider />

            {/* Colors */}
            <div className='flex items-center gap-2'>
                {/* Text Color */}
                <div className='flex items-center gap-1'>
                    <Palette
                        size={16}
                        className='text-neutral-950 dark:text-neutral-50'
                    />
                    <Select onValueChange={handleTextColorChange}>
                        <SelectTrigger className='h-8 w-24 bg-transparent dark:bg-neutral-800'>
                            <SelectValue placeholder='Color' />
                        </SelectTrigger>
                        <SelectContent>
                            {textColorItems}
                        </SelectContent>
                    </Select>
                </div>

                {/* Background Color */}
                <div className='flex items-center gap-1'>
                    <Palette
                        size={16}
                        className='text-neutral-950 dark:text-neutral-50'
                    />
                    <Select onValueChange={handleBgColorChange}>
                        <SelectTrigger className='h-8 w-24 bg-transparent dark:bg-neutral-800'>
                            <SelectValue placeholder='Background' />
                        </SelectTrigger>
                        <SelectContent>
                            {bgColorItems}
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
});

Toolbar.displayName = 'Toolbar';

export default Toolbar;