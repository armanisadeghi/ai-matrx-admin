'use client';

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import {
    IconFileTypeBmp, IconGif, IconFileTypeJpg,
    IconFileTypePng, IconFileTypeCsv, IconFileTypeDoc,
    IconFileTypeDocx, IconFileTypeHtml, IconFileTypePdf,
    IconFileTypePhp, IconFileTypePpt, IconFileTypeTxt,
    IconFileTypeXls, IconFileTypeXml, IconFileTypeZip,
    IconFileTypeCss, IconFileTypeJs, IconFileTypeJsx,
    IconFileTypeRs, IconFileTypeSql, IconFileTypeTs,
    IconFileTypeTsx,
} from "@tabler/icons-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {searchAllIcons} from "@/app/(authenticated)/demo/component-demo/icon-customizer/icon-search";

const IconCustomizer = () => {
    const VALID_SIZES = [
        { value: 0, class: '4' },   // 16px
        { value: 1, class: '5' },   // 20px
        { value: 2, class: '6' },   // 24px
        { value: 3, class: '8' },   // 32px
        { value: 4, class: '10' },  // 40px
        { value: 5, class: '12' },  // 48px
        { value: 6, class: '16' },  // 64px
        { value: 7, class: '20' },  // 80px
        { value: 8, class: '24' },  // 96px
        { value: 9, class: '32' },  // 128px
        { value: 10, class: '40' }, // 160px
        { value: 11, class: '48' }, // 192px
        { value: 12, class: '64' }, // 224px
        { value: 13, class: '80' }, // 256px
        { value: 14, class: '96' }, // 288px
    ];

    const [sizeValue, setSizeValue] = useState(3);
    const [color, setColor] = useState('red');
    const [shade, setShade] = useState('500');
    const [strokeWidth, setStrokeWidth] = useState(2);
    const [selectedIcon, setSelectedIcon] = useState('User');
    const [hover, setHover] = useState(false);
    const [copied, setCopied] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Separate Lucide icons from utility functions
    const lucideIcons = Object.entries(Icons).reduce((acc, [name, component]) => {
        if (
            typeof component === 'function' &&
            name !== 'createLucideIcon' &&
            !name.startsWith('create') &&
            name !== 'default'
        ) {
            acc[name] = component;
        }
        return acc;
    }, {});

    // Combine with Tabler icons
    const tablerIcons = {
        IconFileTypeBmp, IconGif, IconFileTypeJpg,
        IconFileTypePng, IconFileTypeCsv, IconFileTypeDoc,
        IconFileTypeDocx, IconFileTypeHtml, IconFileTypePdf,
        IconFileTypePhp, IconFileTypePpt, IconFileTypeTxt,
        IconFileTypeXls, IconFileTypeXml, IconFileTypeZip,
        IconFileTypeCss, IconFileTypeJs, IconFileTypeJsx,
        IconFileTypeRs, IconFileTypeSql, IconFileTypeTs,
        IconFileTypeTsx,
    };

    const allIcons = { ...lucideIcons, ...tablerIcons };

    // Log counts for debugging
    useEffect(() => {
        console.log('Lucide icons count:', Object.keys(lucideIcons).length);
        console.log('Tabler icons count:', Object.keys(tablerIcons).length);
        console.log('Total icons:', Object.keys(allIcons).length);
    }, []);

    // Filter icons based on search term
    const filteredIcons = Object.entries(allIcons).filter(([name]) =>
        name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const colors = [
        'red', 'orange', 'yellow', 'green', 'blue',
        'indigo', 'purple', 'pink', 'gray'
    ];

    const shades = ['100','200','300', '400', '500', '600', '700','800','900'];

    const SelectedIcon = allIcons[selectedIcon] || Icons.User;
    const currentSize = VALID_SIZES[sizeValue];

    const generateClassName = () => {
        const baseClasses = [
            `w-${currentSize.class}`,
            `h-${currentSize.class}`,
            `text-${color}-${shade}`,
            'transition-colors',
            'duration-200',
        ];

        if (hover) {
            const hoverShade = shade === '900' ? '700' : '900';
            baseClasses.push(`hover:text-${color}-${hoverShade}`);
        }

        return baseClasses.join(' ');
    };

    const iconClassName = generateClassName();

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
        <div className="w-full space-y-4">
            {/* Search Bar */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Search Icons
                </label>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search icons..."
                    className="w-full px-3 py-2 border rounded-lg border-gray-200 dark:border-gray-700
                             dark:bg-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2
                             focus:ring-blue-500"
                />
            </div>

            {/* Icon Selection Section */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select Icon ({filteredIcons.length} icons)
                </label>
                <ScrollArea className="h-48 border rounded-lg border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap gap-1 p-1">
                        {filteredIcons.map(([name, Icon]) => (
                            <button
                                key={name}
                                onClick={() => setSelectedIcon(name)}
                                className={`p-1.5 rounded flex items-center justify-center w-10 h-10
                                    ${selectedIcon === name
                                    ? 'bg-blue-100 dark:bg-blue-900'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                title={name}
                            >
                                <Icon className="w-5 h-5 dark:text-gray-300" />
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Preview and Controls Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
                {/* Preview Section */}
                <div className="flex justify-center items-center h-96 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
                    <SelectedIcon
                        className={iconClassName}
                        strokeWidth={strokeWidth}
                    />
                </div>

                {/* Controls */}
                <div className="space-y-4">
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

                    {/* Color Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Color
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {colors.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`w-8 h-8 rounded-full bg-${c}-500 
                                        ${color === c ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800' : ''}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Shade Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Shade
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {shades.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setShade(s)}
                                    className={`px-3 py-1 rounded 
                                        ${shade === s
                                        ? 'bg-blue-100 dark:bg-blue-900'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                >
                                    <span className="dark:text-gray-300">{s}</span>
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            <input
                                type="checkbox"
                                checked={hover}
                                onChange={(e) => setHover(e.target.checked)}
                                className="mr-2"
                            />
                            Add hover effect
                        </label>
                    </div>
                </div>

                {/* Generated Code with Copy Button */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Generated Code
                        </label>
                        <button
                            onClick={copyToClipboard}
                            className="flex items-center gap-2 px-3 py-1 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            {copied ? (
                                <>
                                    <Icons.Check className="w-4 h-4" />
                                    <span className="dark:text-gray-300">Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Icons.ClipboardCopy className="w-4 h-4" />
                                    <span className="dark:text-gray-300">Copy code</span>
                                </>
                            )}
                        </button>
                    </div>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg space-y-2 font-mono text-sm">
                        <pre className="whitespace-pre-wrap">{generatedCode}</pre>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IconCustomizer;