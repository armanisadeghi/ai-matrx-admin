// Toolbar.tsx
import React from 'react';
import { 
    Bold, 
    Italic, 
    Underline,
    Plus,
    Type,
    Palette,
} from 'lucide-react';
import { ToolbarProps, ToolbarButtonProps, TextStyle } from './types';

const COLOR_OPTIONS = {
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
    ]
};

const FONT_SIZES = [
    { label: 'Small', value: '1' },
    { label: 'Normal', value: '2' },
    { label: 'Large', value: '3' },
    { label: 'Larger', value: '4' },
    { label: 'XL', value: '5' },
];

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ 
    onClick, 
    icon, 
    title,
    className = ''
}) => (
    <button
        onClick={onClick}
        title={title}
        className={`p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${className}`}
    >
        <span className="w-4 h-4 text-neutral-950 dark:text-neutral-50">
            {icon}
        </span>
    </button>
);

const ToolbarDivider: React.FC = () => (
    <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-600" />
);

const Toolbar: React.FC<ToolbarProps> = ({ onApplyStyle, onInsertChip }) => {
    const handleStyleChange = (style: TextStyle) => {
        onApplyStyle(style);
    };

    return (
        <div className="flex items-center gap-2 p-2 border-b border-neutral-300 dark:border-neutral-600">
            {/* Basic Formatting */}
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

            <ToolbarDivider />

            {/* Font Size */}
            <div className="flex items-center gap-1">
                <Type size={16} className="text-neutral-950 dark:text-neutral-50" />
                <select 
                    onChange={(e) => handleStyleChange({ 
                        command: 'fontSize', 
                        value: e.target.value 
                    })}
                    className="p-1 rounded bg-transparent border border-neutral-300 dark:border-neutral-600 text-neutral-950 dark:text-neutral-50 text-sm"
                >
                    {FONT_SIZES.map(size => (
                        <option key={size.value} value={size.value}>
                            {size.label}
                        </option>
                    ))}
                </select>
            </div>

            <ToolbarDivider />

            {/* Text Color */}
            <div className="flex items-center gap-1">
                <Palette size={16} className="text-neutral-950 dark:text-neutral-50" />
                <select 
                    onChange={(e) => handleStyleChange({ 
                        command: 'foreColor', 
                        value: e.target.value 
                    })}
                    className="p-1 rounded bg-transparent border border-neutral-300 dark:border-neutral-600 text-neutral-950 dark:text-neutral-50 text-sm"
                >
                    {COLOR_OPTIONS.text.map(color => (
                        <option key={color.value} value={color.value}>
                            {color.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Background Color */}
            <div className="flex items-center gap-1">
                <Palette size={16} className="text-neutral-950 dark:text-neutral-50" />
                <select 
                    onChange={(e) => handleStyleChange({ 
                        command: 'hiliteColor', 
                        value: e.target.value 
                    })}
                    className="p-1 rounded bg-transparent border border-neutral-300 dark:border-neutral-600 text-neutral-950 dark:text-neutral-50 text-sm"
                >
                    {COLOR_OPTIONS.background.map(color => (
                        <option key={color.value} value={color.value}>
                            {color.label}
                        </option>
                    ))}
                </select>
            </div>

            <ToolbarDivider />

            {/* Chip Insertion */}
            <ToolbarButton 
                onClick={onInsertChip}
                icon={<Plus size={16} />}
                title="Insert Chip"
            />
        </div>
    );
};

export default Toolbar;