export type EditorSection = {
    id: string;
    role: 'system' | 'user' | 'assistant';
    content: string;
    isVisible: boolean;
    order: number;
};

// EditorStateContext.tsx
import React, { createContext, useContext, useState } from 'react';

interface EditorStateContextType {
    editors: EditorSection[];
    moveEditor: (fromIndex: number, toIndex: number) => void;
    toggleVisibility: (id: string) => void;
    addEditor: (role: 'system' | 'user' | 'assistant') => void;
    updateContent: (id: string, content: string) => void;
}

const EditorStateContext = createContext<EditorStateContextType | undefined>(undefined);

export function EditorStateProvider({ children }: { children: React.ReactNode }) {
    const [editors, setEditors] = useState<EditorSection[]>([
        { id: 'system-1', role: 'system', content: '', isVisible: true, order: 0 }
    ]);

    const moveEditor = (fromIndex: number, toIndex: number) => {
        setEditors(prev => {
            const newEditors = [...prev];
            const [moved] = newEditors.splice(fromIndex, 1);
            newEditors.splice(toIndex, 0, moved);
            // Update order values
            return newEditors.map((editor, index) => ({
                ...editor,
                order: index
            }));
        });
    };

    const toggleVisibility = (id: string) => {
        setEditors(prev =>
            prev.map(editor =>
                editor.id === id
                    ? { ...editor, isVisible: !editor.isVisible }
                    : editor
            )
        );
    };

    const addEditor = (role: 'system' | 'user' | 'assistant') => {
        const roleCount = editors.filter(e => e.role === role).length + 1;
        const newId = `${role}-${roleCount}`;
        
        setEditors(prev => [
            ...prev,
            {
                id: newId,
                role,
                content: '',
                isVisible: true,
                order: prev.length
            }
        ]);
    };

    const updateContent = (id: string, content: string) => {
        setEditors(prev =>
            prev.map(editor =>
                editor.id === id
                    ? { ...editor, content }
                    : editor
            )
        );
    };

    return (
        <EditorStateContext.Provider value={{
            editors,
            moveEditor,
            toggleVisibility,
            addEditor,
            updateContent
        }}>
            {children}
        </EditorStateContext.Provider>
    );
}

export const useEditorState = () => {
    const context = useContext(EditorStateContext);
    if (!context) {
        throw new Error('useEditorState must be used within an EditorStateProvider');
    }
    return context;
};
