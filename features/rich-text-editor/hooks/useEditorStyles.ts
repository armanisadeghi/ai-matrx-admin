// useEditorStyles.ts
import { useCallback, RefObject } from 'react';
import { TextStyle } from '../types/editor.types';
import { applyTextStyle } from '../utils/editorUtils';
import { useEditorContext } from '../provider/EditorProvider';

export const useEditorStyles = (
    editorRef: RefObject<HTMLDivElement>,
    editorId: string,
    { updatePlainTextContent }: {
        updatePlainTextContent: () => void;
    }
) => {
    const context = useEditorContext();
    const editorState = context.getEditorState(editorId);

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
        handleStyleChange
    };
};