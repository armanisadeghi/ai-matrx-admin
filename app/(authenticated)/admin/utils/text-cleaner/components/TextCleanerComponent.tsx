'use client';

import React from 'react';
import { useTextCleaner } from '../hooks/useTextCleaner';
import { FullEditableJsonViewer } from '@/components/ui/JsonComponents';
import { useClipboard } from '@/hooks/useClipboard';
import { textContext } from "@/app/(authenticated)/admin/utils/text-cleaner/configs";
import AnimatedSelect from '@/components/matrx/AnimatedForm/AnimatedSelect';
import { FormField } from "@/types/AnimatedFormTypes";
import { Copy } from 'lucide-react';
import {Button, Textarea} from "@/components/ui";

export const TextCleanerComponent: React.FC = () => {
    const {
        inputText,
        cleanedText,
        prefixes,
        suffixes,
        selectedContexts,
        patternsToRemove,
        patternsToReplace,
        markerPatternsToDelete,
        markerPatternsToReplace,
        markerPatternsToExtract,
        setPatternsToRemove,
        setPatternsToReplace,
        setMarkerPatternsToDelete,
        setMarkerPatternsToReplace,
        setMarkerPatternsToExtract,
        handleContextChange,
        handleInputChange,
        extractText,
    } = useTextCleaner();

    const { copyText } = useClipboard();

    const handleCopyTextWithPrefixSuffix = async (index: number) => {
        const prefix = prefixes[index];
        const suffix = suffixes[index];

        let combinedText = '';
        if (prefix) combinedText += `${prefix}\n\n`;
        combinedText += cleanedText;
        if (suffix) combinedText += `\n\n${suffix}`;

        await copyText(combinedText, 'Text with prefix and suffix copied!');
    };

    const contextSelectField: FormField = {
        name: 'context',
        label: 'Context',
        type: 'select',
        options: textContext.map(entry => entry.name),
        required: false,
    };

    return (
        <div className="w-full">
            {/* Top section for textareas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <Textarea
                    value={inputText}
                    onChange={(e) => handleInputChange(e.target.value)}
                    rows={10}
                    className="w-full resize-y"
                    placeholder="Paste your text here"
                />

                <div className="relative">
                    <Textarea
                        value={cleanedText}
                        readOnly
                        rows={10}
                        className="w-full resize-y"
                        placeholder="Your cleaned text will appear here"
                    />
                    <Button
                        className="absolute right-2 bottom-2 p-2 h-[40px] min-h-[40px]"
                        onClick={() => copyText(cleanedText)}
                    >
                        <Copy size={20} />
                    </Button>
                </div>
            </div>

            {/* Prefix/Suffix section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
                {selectedContexts.map((context, index) => (
                    <div key={index} className="space-y-2">
                        <div className="flex items-stretch space-x-2">
                            <AnimatedSelect
                                field={contextSelectField}
                                value={context ? textContext.find(c => c.id === context.id)?.name || '' : ''}
                                onChange={(value) => {
                                    const selectedContext = textContext.find(c => c.name === value);
                                    if (selectedContext) {
                                        handleContextChange(index, selectedContext.id);
                                    }
                                }}
                                hideLabel={true}
                                className="flex-grow h-[40px] min-h-[40px]"
                            />
                            <Button
                                onClick={() => handleCopyTextWithPrefixSuffix(index)}
                                className="p-2 flex-shrink-0 flex items-center justify-center h-[40px] min-h-[40px]"
                            >
                                <Copy size={20} />
                            </Button>
                        </div>
                        <Textarea
                            value={prefixes[index] || ''}
                            readOnly
                            rows={8}
                            className="w-full resize-y"
                            placeholder="Prefix will appear here"
                        />
                        <Textarea
                            value={suffixes[index] || ''}
                            readOnly
                            rows={8}
                            className="w-full resize-y"
                            placeholder="Suffix will appear here"
                        />
                    </div>
                ))}
            </div>

            {/* JSON Viewers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <FullEditableJsonViewer
                    title="Patterns to Remove"
                    data={patternsToRemove}
                    onChange={(newData) => setPatternsToRemove(newData as string[])}
                    maxHeight="700px"
                />
                <FullEditableJsonViewer
                    title="Patterns to Replace"
                    data={patternsToReplace}
                    onChange={(newData) => setPatternsToReplace(newData as { pattern: string; replacement: string }[])}
                    maxHeight="700px"
                />
                <FullEditableJsonViewer
                    title="Marker Patterns to Delete"
                    data={markerPatternsToDelete}
                    onChange={(newData) => setMarkerPatternsToDelete(newData as { start: string; end: string }[])}
                    maxHeight="700px"
                />
                <FullEditableJsonViewer
                    title="Marker Patterns to Replace"
                    data={markerPatternsToReplace}
                    onChange={(newData) => setMarkerPatternsToReplace(newData as { start: string; end: string; replacement: string }[])}
                    maxHeight="700px"
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <FullEditableJsonViewer
                    title="Marker Patterns to Extract"
                    data={markerPatternsToExtract}
                    onChange={(newData) => setMarkerPatternsToExtract(newData as { start: string; end: string }[])}
                    maxHeight="700px"
                />
            </div>

            {/* Extract and copy text button */}
            <Button onClick={() => copyText(extractText(inputText))}>
                Extract and Copy Text Between Markers
            </Button>
        </div>
    );
};
