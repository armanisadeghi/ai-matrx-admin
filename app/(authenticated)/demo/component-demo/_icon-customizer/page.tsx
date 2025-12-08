'use client';

import React, {useState} from 'react';
import {ScrollArea} from "@/components/ui/scroll-area";
import {availableIcons} from './icons';
import {Check, ClipboardCopy} from 'lucide-react';
import {Card, CardHeader, CardTitle, CardContent} from "@/components/ui/card";
import IconSearchCard from "@/app/(authenticated)/demo/component-demo/_icon-customizer/icon-search/IconSearchCard";
import { Checkbox } from '@/components/ui/checkbox';

const IconCustomizer = () => {
    const VALID_SIZES = [
        {value: 0, class: '4'},   // 16px
        {value: 1, class: '5'},   // 20px
        {value: 2, class: '6'},   // 24px
        {value: 3, class: '8'},   // 32px
        {value: 4, class: '10'},  // 40px
        {value: 5, class: '12'},  // 48px
        {value: 6, class: '16'},  // 64px
        {value: 7, class: '20'},  // 80px
        {value: 8, class: '24'},  // 96px
        {value: 9, class: '32'},  // 128px
        {value: 10, class: '40'}, // 160px
        {value: 11, class: '48'}, // 192px
        {value: 12, class: '64'}, // 224px
        {value: 13, class: '80'}, // 256px
        {value: 14, class: '96'}, // 288px
    ];

    const [sizeValue, setSizeValue] = useState(8);
    const [color, setColor] = useState('red');
    const [shade, setShade] = useState('500');
    const [strokeWidth, setStrokeWidth] = useState(1);
    const [selectedIcon, setSelectedIcon] = useState('Heart');
    const [hover, setHover] = useState(false);
    const [copied, setCopied] = useState(false);

    const icons = availableIcons

    const colors = [
        'slate', 'gray', 'zinc', 'neutral', 'stone',  // Grays
        'red', 'orange', 'amber', 'yellow', 'lime',   // Warm colors
        'green', 'emerald', 'teal', 'cyan', 'sky',    // Cool colors
        'blue', 'indigo', 'violet', 'purple', 'fuchsia', // Purple tones
        'pink', 'rose', 'black', 'white'              // Pinks and monochrome
    ];

    const shades = ['100', '200', '300', '400', '500', '600', '700', '800', '900'];

    // Add this before the return statement
    const availableShades = color === 'black' || color === 'white'
        ? ['NA']  // Only show "NA" for black and white
        : shades; // Show all shades for other colors

    const SelectedIcon = icons[selectedIcon];
    const currentSize = VALID_SIZES[sizeValue];

    // Single source of truth for className generation
    const generateClassName = () => {
        // Base classes that are always applied
        const baseClasses = [
            `w-${currentSize.class}`,
            `h-${currentSize.class}`,
            color === 'black' ? 'text-black' :
                color === 'white' ? 'text-white' :
                    `text-${color}-${shade}`,
            'transition-colors',
            'duration-200',
        ];

        // Add hover classes only if hover is enabled and not black/white
        if (hover && color !== 'black' && color !== 'white') {
            const hoverShade = shade === '900' ? '700' : '900';
            baseClasses.push(`hover:text-${color}-${hoverShade}`);
        }

        return baseClasses.join(' ');
    };

    // Get the class string once and reuse it
    const iconClassName = generateClassName();

    // Generate code that matches exactly what we're using
    const generatedCode = `import { ${selectedIcon} } from 'lucide-react';\n\n<${selectedIcon} \n  className="${iconClassName}"\n  strokeWidth={${strokeWidth}}\n/>`;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(generatedCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="w-full mt-10 space-y-4">
            {/* Main grid container */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left column with icon selection */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Select Icon</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-48 rounded-lg border">
                            <div className="flex flex-wrap gap-1 p-1">
                                {Object.entries(icons).map(([name, Icon]) => (
                                    <button
                                        key={name}
                                        onClick={() => setSelectedIcon(name)}
                                        className={`p-1.5 rounded flex items-center justify-center w-10 h-10
                                        ${selectedIcon === name
                                            ? 'bg-blue-100 dark:bg-blue-900'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                        title={name}
                                    >
                                        <Icon
                                            className={`w-8 h-8 ${
                                                color === 'black' ? 'text-black' :
                                                    color === 'white' ? 'text-white' :
                                                        `text-${color}-${shade}`
                                            }`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Right column with preview */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-center items-center h-48 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <SelectedIcon
                                className={iconClassName}
                                strokeWidth={strokeWidth}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Controls section in a grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left column controls */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Size & Color</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Size Selection */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Size (w-{currentSize.class})
                            </label>
                            <input
                                type="range"
                                min={0}
                                max={VALID_SIZES.length - 1}
                                value={sizeValue}
                                onChange={(e) => setSizeValue(Number(e.target.value))}
                                className="w-full"
                            />
                            <div className="flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400">
                                {VALID_SIZES.map((size, index) => (
                                    <button
                                        key={size.class}
                                        onClick={() => setSizeValue(index)}
                                        className={`px-2 py-1 rounded ${
                                            sizeValue === index
                                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        w-{size.class}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Stroke Width */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Stroke Width
                            </label>
                            <div className="flex gap-2">
                                {[1, 2].map((w) => (
                                    <button
                                        key={w}
                                        onClick={() => setStrokeWidth(w)}
                                        className={`px-3 py-1 rounded 
                                        ${strokeWidth === w
                                            ? 'bg-blue-100 dark:bg-blue-900'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    >
                                        <span className="dark:text-gray-300">{w}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Hover Effect Toggle */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Checkbox
                                    checked={hover}
                                    onCheckedChange={(checked) => setHover(checked === 'indeterminate' ? false : checked)}
                                />
                                Add hover effect
                            </label>
                        </div>

                    </CardContent>
                </Card>

                {/* Right column controls */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Style Options</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Color Selection */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Color
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {colors.map((c) => {
                                    const bgColorClass = c === 'black' ? 'bg-black' :
                                        c === 'white' ? 'bg-white' :
                                            `bg-${c}-500`;

                                    const buttonClass = `
                                    w-8 h-8 rounded-full border-border
                                    ${bgColorClass}
                                    ${color === c ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800' : ''}
                                    relative group
                                `.trim().replace(/\s+/g, ' ');

                                    return (
                                        <button
                                            key={c}
                                            onClick={() => setColor(c)}
                                            title={c}
                                            className={buttonClass}
                                        >
                                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs
                                            bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity
                                            whitespace-nowrap"
                                        >
                                            {c}
                                        </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Shade Selection */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Shade
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {availableShades.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setShade(s)}
                                        className={`px-3 py-1 rounded 
                                        ${(shade === s || (s === 'NA' && (color === 'black' || color === 'white')))
                                            ? 'bg-blue-100 dark:bg-blue-900'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                        disabled={s === 'NA'}
                                    >
                                        <span className="dark:text-gray-300">{s}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </div>

            {/* Generated Code section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Generated Code</CardTitle>
                    <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 px-3 py-1 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4"/>
                                <span className="dark:text-gray-300">Copied!</span>
                            </>
                        ) : (
                            <>
                                <ClipboardCopy className="w-4 h-4"/>
                                <span className="dark:text-gray-300">Copy code</span>
                            </>
                        )}
                    </button>
                </CardHeader>
                <CardContent>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
                        <pre className="whitespace-pre-wrap">{generatedCode}</pre>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default IconCustomizer;