// File: useSetEditorContent.ts
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { EditorHookResult } from './useEditor';
import { useEditorContext } from '../provider/EditorProvider';
import { getEditorElement } from '../utils/editorUtils';
import { createChipLine, createEmptyLine, createTextOnlyLine, findAllChipPatterns, processContentLines } from '../utils/setEditorUtils';
import { createCompleteChipStructure } from '../utils/chipService';
import { useAppDispatch, useEntityTools } from '@/lib/redux';
import { DataBrokerData, MatrxRecordId } from '@/types';
import { ChipData } from '../types/editor.types';
import { useFetchQuickRef } from '@/app/entities/hooks/useFetchQuickRef';

export const useSetEditorContent = (editorId: string, useEditor: EditorHookResult) => {
    const context = useEditorContext();
    const getEditor = useCallback(() => getEditorElement(editorId), [editorId]);
    const dispatch = useAppDispatch();
    const { store, selectors, actions } = useEntityTools('dataBroker');
    const [isProcessing, setIsProcessing] = useState(false);
    const editorRef = useRef<HTMLElement | null>(null);

    const { quickReferenceRecords } = useFetchQuickRef('dataBroker');

    useEffect(() => {
        dispatch(actions.setSelectionMode('multiple'));
    }, [dispatch, actions]);

    const getBrokerById = useCallback(
        (id: MatrxRecordId) => {
            return selectors.selectRecordByKey(store.getState(), id) as DataBrokerData;
        },
        [store, selectors]
    );

    // Prepare chip data from brokers
    const prepareChipData = useCallback(
        (content: string): Map<string, ChipData> => {
            const chipPatterns = findAllChipPatterns(content);
            const chipDataMap = new Map<string, ChipData>();
            let count = 1;

            chipPatterns.forEach((pattern) => {
                const broker = getBrokerById(pattern.matrxRecordId);
                if (broker) {
                    chipDataMap.set(pattern.matrxRecordId, {
                        id: pattern.matrxRecordId,
                        label: broker.name,
                        stringValue: broker.defaultValue,
                        brokerId: pattern.matrxRecordId,
                        color: context.colors.getNextColor(),
                    });
                } else {
                    console.log('Orphaned chip:', pattern.matrxRecordId, pattern.id, pattern.originalText);
                    chipDataMap.set(pattern.id, {
                        id: pattern.id,
                        label: `Orphaned Chip ${count++}`,
                        stringValue: pattern.originalText.slice(1, -2),
                        brokerId: 'disconnected',
                        color: context.colors.getNextColor(),
                    });
                }
            });

            return chipDataMap;
        },
        [getBrokerById]
    );

    // Main content setting callback
    const setContent = useCallback(
        async (content: string) => {
            setIsProcessing(true);
            try {
                const editor = getEditor();
                if (!editor) {
                    throw new Error('Editor element not found');
                }
                editorRef.current = editor;

                // Prepare all chip data first
                const chipDataMap = prepareChipData(content);
                console.log('Chip data map:', chipDataMap);

                // Process content into lines
                const processedLines = processContentLines(content);

                // Clear existing content
                editor.innerHTML = '';

                // Create line elements with chip data
                const lineElements = processedLines.map((line) => {
                    if (line.isEmpty) {
                        return createEmptyLine(line.isFirstLine);
                    }

                    if (line.segments.length === 1 && line.segments[0].type === 'text') {
                        return createTextOnlyLine(line.segments[0].content, line.isFirstLine);
                    }

                    return createChipLine(
                        line.segments,
                        line.isFirstLine,
                        (chipData) => createCompleteChipStructure(chipData, useEditor.dragConfig, false, useEditor.chipHandlers),
                        chipDataMap // Pass the prepared chipDataMap
                    );
                });

                // Append all lines in one batch
                lineElements.forEach((element) => {
                    editor.appendChild(element);
                });

                // Position cursor at end
                const selection = window.getSelection();
                if (selection && editor.lastChild) {
                    const range = document.createRange();
                    range.selectNodeContents(editor.lastChild);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }

                context.setPlainTextContent(editorId, content);
                context.chips.setChipData(editorId, Array.from(chipDataMap.values()));

                return true;
            } catch (error) {
                console.error('Error setting editor content:', error);
                return false;
            } finally {
                setIsProcessing(false);
            }
        },
        [editorId, getEditor, prepareChipData, useEditor, context]
    );

    return {
        isProcessing,
        setContent,
    };
};
