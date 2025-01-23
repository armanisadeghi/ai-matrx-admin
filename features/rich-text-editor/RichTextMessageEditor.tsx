// RichTextEditor.tsx
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useEditor } from '@/features/rich-text-editor/hooks/useEditor';
import { EditorChipButton } from './components/EditorChipButton';
import { WithRefsProps } from '@/lib/refs';
import { getFormattedContent, setupEditorAttributes } from './utils/editorUtils';
import { getEditorSelection, SelectionState } from './utils/selectionUtils';
import { useChipMenu } from './components/ChipContextMenu';
import { ChipHandlers, createChipHandlers } from './utils/chipService';
import { useSetEditorContent } from './hooks/useSetEditorContent';
import { DisplayMode, transformMatrxText } from './utils/patternUtils';
import { EditorState, useMessageEditor } from './provider/new/messageEditorProvider';

export interface RichTextMessageEditorProps extends WithRefsProps {
    onChange?: (content: string) => void;
    className?: string;
    initialContent?: string;
    onDragOver?: (e: React.DragEvent<HTMLElement>) => void;
    onDrop?: (e: React.DragEvent<HTMLElement>) => void;
    displayMode?: DisplayMode;  // Add this
    editorState?: EditorState; // Add this to connect with our provider
    onBlur?: () => void;
    chipHandlers?: ChipHandlers;
}

const RichTextMessageEditor: React.FC<RichTextMessageEditorProps> = ({
    componentId,
    onChange,
    className = '',
    onDragOver,
    onDrop,
    initialContent,
    displayMode = DisplayMode.NAME,
    editorState,
    onBlur,
    chipHandlers: handlers,
}) => {
    const editorContext = useMessageEditor();
    const [displayContent, setDisplayContent] = useState('');
    

    const editorRef = useRef<HTMLDivElement>(null);
    const initializedRef = useRef(false);
    const blurListenersRef = useRef<Set<() => void>>(new Set());
    const [selectionState, setSelectionState] = useState<SelectionState>({
        hasSelection: false,
        selectedText: '',
        range: null,
    });

    const { showMenu } = useChipMenu();

    const chipHandlers = createChipHandlers({ showMenu, editorId: componentId, handlers });
    const editorHook = useEditor(componentId, chipHandlers);
    const { setContent, isProcessing } = useSetEditorContent(componentId, editorHook);

    useEffect(() => {
        if (isProcessing || !editorRef.current || initializedRef.current) return;
        
        if (displayMode !== DisplayMode.ENCODED) {
            const transformed = transformMatrxText(
                editorContext.state.encodedContent,
                displayMode
            );
            setDisplayContent(transformed);
        } else {
            setDisplayContent(editorContext.state.encodedContent);
            setContent(editorContext.state.encodedContent);

        }
    }, [editorContext?.state.encodedContent, displayMode]);


    // Initialize editor with content
    useEffect(() => {
        if (isProcessing || !editorRef.current || initializedRef.current) return;
        
        setupEditorAttributes(editorRef.current, componentId);
        initializedRef.current = true;
    }, [isProcessing, displayContent]);

    const {
        // Internal methods
        updatePlainTextContent,
        // Ref methods
        insertChip,
        convertSelectionToChip,
        applyStyle,
        getText,
        normalize,
        updateContent,
        focus,
        // Event handlers
        handleNativeDragStart,
        handleNativeDragEnd,
        handleDragOver: handleDragOverInternal,
        handleDrop: handleDropInternal,
    } = editorHook;


    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        const content = getFormattedContent(e.currentTarget);
        editorContext?.updateEncodedContent(content);
    };


    // Handle selection changes
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const handleSelectionChange = () => {
            const newState = getEditorSelection(editor);
            setSelectionState(newState);
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        editor.addEventListener('mouseup', handleSelectionChange);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            editor.removeEventListener('mouseup', handleSelectionChange);
        };
    }, []);

    useEffect(() => {
        if (isProcessing) return;
        const editor = editorRef.current;
        if (!editor || initializedRef.current) return;
        console.log('--Additional useEffect:', initialContent);

        const handlePaste = useCallback((e: ClipboardEvent) => {
            e.preventDefault();
            const text = e.clipboardData?.getData('text/plain');
            if (text) {
                document.execCommand('insertText', false, text);
                const newContent = getFormattedContent(editorRef.current!);
                editorContext?.updateEncodedContent(newContent);
            }
        }, [editorContext]);

        editor.addEventListener('paste', handlePaste);
        editor.addEventListener('dragstart', handleNativeDragStart);
        editor.addEventListener('dragend', handleNativeDragEnd);
        console.log('event listeners added');

        return () => {
            editor.removeEventListener('paste', handlePaste);
            editor.removeEventListener('dragstart', handleNativeDragStart);
            editor.removeEventListener('dragend', handleNativeDragEnd);
        };
    }, [componentId, initialContent, handleNativeDragStart, handleNativeDragEnd, updatePlainTextContent]);


    const handleNewChip = () => {
        if (selectionState.hasSelection) {
            console.log('Convert to chip');
            convertSelectionToChip();
        } else {
            console.log('Inserting New chip');
            insertChip();
        }
    };

    const handleBlurInternal = useCallback(() => {
        normalize();
        const normalizedContent = getFormattedContent(editorRef.current!);
        editorContext?.updateEncodedContent(normalizedContent);
        onBlur?.();
        blurListenersRef.current.forEach((listener) => listener());
    }, [normalize, onBlur, editorContext]);


    return (
        <div className='relative group w-full h-full flex flex-col'>
            <div className='flex-1 overflow-hidden'>
                <div
                    ref={editorRef}
                    className={`w-full h-full overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 
                        dark:scrollbar-thumb-neutral-600 scrollbar-track-transparent px-4 py-2
                        focus:outline-none text-neutral-950 dark:text-neutral-50 whitespace-pre-wrap ${className}`}
                    contentEditable
                    onInput={handleInput}
                    onBlur={handleBlurInternal}
                    onDragOver={onDragOver || handleDragOverInternal}
                    onDrop={onDrop || handleDropInternal}
                />
            </div>

            <EditorChipButton
                editorId={componentId}
                onInsertChip={handleNewChip}
                onConvertToChip={handleNewChip}
                hasSelection={selectionState.hasSelection}
            />
        </div>
    );
};

export default RichTextMessageEditor;
