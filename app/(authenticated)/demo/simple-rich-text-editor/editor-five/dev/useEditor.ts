import { useState, useCallback, RefObject, useRef, useEffect } from 'react';
import { EditorRef, TextStyle, ChipData, ChipRequestOptions } from '../types';
import {
    ensureValidContainer,
    createChipElement,
    getDropRange,
    isValidDropTarget,
    extractTextContent,
    applyTextStyle,
    getSelectedText,
} from '../utils/editorUtils';
import { generateChipLabel } from '../utils/generateBrokerName';
import { v4 as uuidv4 } from 'uuid';
import { getNextAvailableColor } from '../utils/colorUitls';
import { debugEditorState } from '../utils/debugUtils';

const DEBUG_MODE = false;

export const useEditor = (editorRef: RefObject<HTMLDivElement>) => {
    const [chipCounter, setChipCounter] = useState(1);
    const [draggedChip, setDraggedChip] = useState<HTMLElement | null>(null);
    const [plainTextContent, setPlainTextContent] = useState('');
    const [chipData, setChipData] = useState<ChipData[]>([]);
    const [colorAssignments, setColorAssignments] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        if (editorRef.current) {
        }
    }, [editorRef.current]);


    const createNewChipData = useCallback(
        (requestOptions: ChipRequestOptions = {}): ChipData => {
            const id = requestOptions.id ?? uuidv4();
            const stringValue = requestOptions.stringValue ?? '';
            const label = requestOptions.label ?? generateChipLabel({ chipData, requestOptions });
            const color = requestOptions.color ?? getNextAvailableColor(colorAssignments);
            const brokerId = requestOptions.brokerId ?? 'disconnected';

            setColorAssignments((prev) => new Map(prev).set(id, color));

            return {
                id,
                label,
                stringValue,
                color,
                brokerId,
            };
        },
        [chipData, colorAssignments]
    );

    const addChipData = useCallback((data: ChipData) => {
        setChipData((prev) => [...prev, data]);
        setChipCounter((prev) => prev + 1);
    }, []);

    const removeChipData = useCallback((chipId: string) => {
        setChipData((prev) => prev.filter((chip) => chip.id !== chipId));
    }, []);

    const getText = useCallback(() => {
        return plainTextContent;
    }, [plainTextContent]);

    const focus = useCallback(() => {
        if (editorRef.current) {
            editorRef.current.focus();
        }
    }, [editorRef]);


    const updatePlainTextContent = useCallback(() => {
        if (!editorRef.current) return;
        const text = extractTextContent(editorRef.current);
        setPlainTextContent(text);
    }, [editorRef]);

    const normalizeContent = useCallback(() => {
        if (!editorRef.current) return;
        console.log('Normalizing content');
        const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT, null);

        let node;
        while ((node = walker.nextNode())) {
            if (node.parentNode === editorRef.current) {
                const span = document.createElement('span');
                node.parentNode.insertBefore(span, node);
                span.appendChild(node);
            }
        }
    }, [editorRef]);

    const insertChip = useCallback(() => {
        const chipData = createNewChipData();
        const editor = editorRef.current;

        const beforeState = debugEditorState(editor);

        const selection = window.getSelection();
        const debbugWrapperClass = `chip-wrapper border border-${chipData.color}-500`;

        if (!editor || !selection) return;

        const currentRange = ensureValidContainer(editor, selection);

        const chipWrapper = document.createElement('span');
        chipWrapper.className = DEBUG_MODE ? debbugWrapperClass : 'chip-wrapper';

        const chip = createChipElement(chipData);
        chip.addEventListener('dragstart', handleNativeDragStart);
        chip.addEventListener('dragend', handleNativeDragEnd);

        const leadingSpace = document.createTextNode('\u00A0');
        const trailingSpace = document.createTextNode('\u00A0');
        const anchorNode = document.createTextNode('\u200B');

        let container = currentRange.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) {
            container = container.parentNode;
        }

        if (container === editor) {
            const span = document.createElement('span');
            span.appendChild(document.createTextNode('\u200B'));

            if (currentRange.startContainer === editor) {
                editor.insertBefore(span, editor.firstChild);
            } else {
                editor.appendChild(span);
            }

            container = span;
            currentRange.selectNode(span);
        }

        const parent = currentRange.endContainer.parentNode;
        const insertionWrapper = document.createElement('span');
        insertionWrapper.appendChild(leadingSpace);
        insertionWrapper.appendChild(chipWrapper);
        chipWrapper.appendChild(chip);
        insertionWrapper.appendChild(trailingSpace);
        insertionWrapper.appendChild(anchorNode);

        if (currentRange.collapsed) {
            const insertPosition = currentRange.startContainer;
            if (insertPosition.nodeType === Node.TEXT_NODE) {
                const textNode = insertPosition as Text;
                const afterText = textNode.splitText(currentRange.startOffset);
                parent?.insertBefore(insertionWrapper, afterText.parentNode?.nextSibling || null);
            } else {
                parent?.insertBefore(insertionWrapper, container.nextSibling);
            }
        } else {
            currentRange.deleteContents();
            currentRange.insertNode(insertionWrapper);
        }

        const finalRange = document.createRange();
        finalRange.setStart(anchorNode, 0);
        finalRange.setEnd(anchorNode, 0);
        selection.removeAllRanges();
        selection.addRange(finalRange);

        const afterState = debugEditorState(editor);

        if (afterState.diffSummary.nestedSpans > beforeState.diffSummary.nestedSpans) {
            console.warn('Nested spans increased during chip insertion');
        }
    
        setChipCounter((prev) => prev + 1);
        addChipData(chipData);
        updatePlainTextContent();
    }, [chipCounter, editorRef]);

    const handleNativeDragStart = useCallback((e: DragEvent) => {
        const chip = e.target as HTMLElement;
        setDraggedChip(chip);
        e.dataTransfer?.setData('text/plain', chip.textContent || '');
        chip.classList.add('opacity-50');
        e.stopPropagation();
    }, []);

    const handleNativeDragEnd = useCallback((e: DragEvent) => {
        const chip = e.target as HTMLElement;
        chip.classList.remove('opacity-50');
        setDraggedChip(null);
    }, []);

    const handleDragOver = useCallback(
        (e: React.DragEvent<HTMLElement>) => {
            if (!draggedChip || !editorRef.current) return;
            e.preventDefault();

            const range = getDropRange(e.clientX, e.clientY, editorRef.current);

            const oldIndicator = editorRef.current.querySelector('.drop-indicator');
            oldIndicator?.remove();

            if (range && isValidDropTarget(range.commonAncestorContainer, editorRef.current)) {
                const indicator = document.createElement('span');
                indicator.className = 'drop-indicator inline-block w-2 h-4 bg-blue-500 mx-0.5';
                range.insertNode(indicator);
            }
        },
        [draggedChip, editorRef]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLElement>) => {
            e.preventDefault();
            if (!draggedChip || !editorRef.current) return;

            const range = getDropRange(e.clientX, e.clientY, editorRef.current);
            if (!range || !isValidDropTarget(range.commonAncestorContainer, editorRef.current)) return;

            const indicator = editorRef.current.querySelector('.drop-indicator');
            indicator?.remove();

            const chipWrapper = draggedChip.parentNode as HTMLElement;
            range.insertNode(chipWrapper);

            const newRange = document.createRange();
            newRange.setStartAfter(chipWrapper);
            newRange.collapse(true);

            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(newRange);

            normalizeContent();
            updatePlainTextContent();
        },
        [draggedChip, editorRef]
    );

    const convertSelectionToChip = useCallback(() => {
        const { text, range } = getSelectedText();
        const chipData = createNewChipData({ stringValue: text });
        const editor = editorRef.current;
        const debbugWrapperClass = `chip-wrapper border border-${chipData.color}-500`;

        if (!editor) return;

        const chipWrapper = document.createElement('span');
        chipWrapper.className = DEBUG_MODE ? debbugWrapperClass : 'chip-wrapper';

        const chip = createChipElement(chipData);
        chip.addEventListener('dragstart', handleNativeDragStart);
        chip.addEventListener('dragend', handleNativeDragEnd);

        const leadingSpace = document.createTextNode('\u00A0');
        const trailingSpace = document.createTextNode('\u00A0');
        const anchorNode = document.createTextNode('\u200B');

        chipWrapper.appendChild(chip);

        const insertionWrapper = document.createElement('span');
        insertionWrapper.appendChild(leadingSpace);
        insertionWrapper.appendChild(chipWrapper);
        insertionWrapper.appendChild(trailingSpace);
        insertionWrapper.appendChild(anchorNode);

        range.deleteContents();
        range.insertNode(insertionWrapper);

        // Move cursor after chip
        const finalRange = document.createRange();
        finalRange.setStart(anchorNode, 0);
        finalRange.setEnd(anchorNode, 0);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(finalRange);

        setChipCounter((prev) => prev + 1);
        addChipData(chipData);
        updatePlainTextContent();
        return true;
    }, [chipCounter, editorRef, handleNativeDragStart, handleNativeDragEnd]);

    const handleStyleChange = useCallback(
        (style: TextStyle) => {
            if (!editorRef.current) return;
            applyTextStyle(style);
            editorRef.current.focus();
            updatePlainTextContent();
        },
        [editorRef, updatePlainTextContent]
    );

    return {
        // State
        chipCounter,
        draggedChip,
        plainTextContent,
        chipData,
        colorAssignments,

        // Ref Manager methods
        insertChip,
        convertSelectionToChip,
        applyStyle: handleStyleChange,
        getText,
        normalize: normalizeContent,
        updateContent: updatePlainTextContent,
        focus,

        // Event handlers
        handleNativeDragStart,
        handleNativeDragEnd,
        handleDragOver,
        handleDrop,
        handleStyleChange,
        updatePlainTextContent,
        normalizeContent,
        removeChipData,
        createNewChipData,
    };
};

export type EditorHookResult = ReturnType<typeof useEditor>;
