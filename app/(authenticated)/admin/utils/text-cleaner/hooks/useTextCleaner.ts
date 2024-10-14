import { useState } from 'react';
import {
    initialPatternsToRemove,
    initialPatternsToReplace,
    initialMarkerPatternsToDelete,
    initialMarkerPatternsToReplace,
    initialMarkerPatternsToExtract,
    textContext,
    TextContextEntry,
} from '../configs';

export function useTextCleaner() {
    const [inputText, setInputText] = useState<string>('');
    const [cleanedText, setCleanedText] = useState<string>('');
    const [patternsToRemove, setPatternsToRemove] = useState<string[]>(initialPatternsToRemove);
    const [patternsToReplace, setPatternsToReplace] = useState<{ pattern: string; replacement: string }[]>(initialPatternsToReplace);
    const [markerPatternsToDelete, setMarkerPatternsToDelete] = useState<{ start: string; end: string }[]>(initialMarkerPatternsToDelete);
    const [markerPatternsToReplace, setMarkerPatternsToReplace] = useState<{ start: string; end: string; replacement: string }[]>(initialMarkerPatternsToReplace);
    const [markerPatternsToExtract, setMarkerPatternsToExtract] = useState<{ start: string; end: string }[]>(initialMarkerPatternsToExtract);

    // Initialize selectedContexts with the first 5 entries (or less if there are fewer entries)
    const [selectedContexts, setSelectedContexts] = useState<TextContextEntry[]>(
        textContext.slice(0, 5).map(entry => entry)
    );

    // Initialize prefixes and suffixes based on the selected contexts
    const [prefixes, setPrefixes] = useState<string[]>(
        selectedContexts.map(context => context.prefix)
    );
    const [suffixes, setSuffixes] = useState<string[]>(
        selectedContexts.map(context => context.suffix)
    );

    // Handle context changes
    const handleContextChange = (index: number, contextId: string) => {
        const newContext = textContext.find(entry => entry.id === contextId);
        if (newContext) {
            setSelectedContexts(prev => {
                const updated = [...prev];
                updated[index] = newContext;
                return updated;
            });
            setPrefixes(prev => {
                const updated = [...prev];
                updated[index] = newContext.prefix;
                return updated;
            });
            setSuffixes(prev => {
                const updated = [...prev];
                updated[index] = newContext.suffix;
                return updated;
            });
        }
    };

    // Helper function to apply "none" as a special marker (unchanged)
    const resolveMarkers = (start: string, end: string, text: string): { startIdx: number; endIdx: number } => {
        const startIdx = start === 'none' ? 0 : text.indexOf(start);
        const endIdx = end === 'none' ? text.length : text.indexOf(end) + end.length;
        return { startIdx, endIdx };
    };

    // Function to clean the input text (unchanged)
    const cleanText = (text: string) => {
        let cleaned = text;

        // Remove patterns
        patternsToRemove.forEach((pattern) => {
            const regex = new RegExp(pattern, 'g');
            cleaned = cleaned.replace(regex, '');
        });

        // Replace patterns
        patternsToReplace.forEach(({ pattern, replacement }) => {
            const regex = new RegExp(pattern, 'g');
            cleaned = cleaned.replace(regex, replacement);
        });

        // Handle marker-based deletion
        markerPatternsToDelete.forEach(({ start, end }) => {
            const { startIdx, endIdx } = resolveMarkers(start, end, cleaned);
            if (startIdx !== -1 && endIdx !== -1) {
                cleaned = cleaned.slice(0, startIdx) + cleaned.slice(endIdx);
            }
        });

        // Handle marker-based replacement
        markerPatternsToReplace.forEach(({ start, end, replacement }) => {
            const { startIdx, endIdx } = resolveMarkers(start, end, cleaned);
            if (startIdx !== -1 && endIdx !== -1) {
                cleaned = cleaned.slice(0, startIdx) + replacement + cleaned.slice(endIdx);
            }
        });

        return cleaned;
    };

    // Function to extract text based on marker patterns (unchanged)
    const extractText = (text: string) => {
        let extracted = '';

        markerPatternsToExtract.forEach(({ start, end }) => {
            const { startIdx, endIdx } = resolveMarkers(start, end, text);
            if (startIdx !== -1 && endIdx !== -1) {
                extracted += text.slice(startIdx, endIdx) + '\n';
            }
        });

        return extracted.trim();
    };

    const handleInputChange = (text: string) => {
        setInputText(text);
        setCleanedText(cleanText(text));
    };

    return {
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
        setInputText,
        setCleanedText,
        setPrefixes,
        setSuffixes,
        setPatternsToRemove,
        setPatternsToReplace,
        setMarkerPatternsToDelete,
        setMarkerPatternsToReplace,
        setMarkerPatternsToExtract,
        handleContextChange,
        handleInputChange,
        extractText,
    };
}
