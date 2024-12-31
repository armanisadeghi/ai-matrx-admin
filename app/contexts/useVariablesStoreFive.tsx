// useVariablesStore.ts
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Variable, EditorState, EditorRef } from '../(authenticated)/tests/recipe-creation/brokers-five/types';
import ReactDOM from 'react-dom';
import { VariableChip } from '../(authenticated)/tests/recipe-creation/brokers-five/VariableChip';


const VARIABLE_PATTERN = /\{([^}]+)\}!/g;

const COLORS = [
    'rgb(239 68 68)', // red
    'rgb(34 197 94)', // green
    'rgb(59 130 246)', // blue
    'rgb(168 85 247)', // purple
    'rgb(234 179 8)',  // yellow
    'rgb(236 72 153)'  // pink
] as const;

interface VariablesState {
    variables: Record<string, Variable>;
    editor: EditorState;
    processing: boolean;
    addVariable: (data?: Partial<Variable>) => string;
    updateVariable: (id: string, data: Partial<Variable>) => void;
    deleteVariable: (id: string) => void;
    restoreVariable: (id: string) => void;
    processContent: (editorRef: EditorRef) => void;
    createVariableFromSelection: (name: string, editorRef: EditorRef) => void;
    createVariableAtEnd: (name: string, editorRef: EditorRef) => void;
}

const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

export const useVariablesStoreFive = create<VariablesState>((set, get) => ({
    variables: {},
    editor: {
        content: '',
        selection: null
    },
    processing: false,

    addVariable: (data) => {
        const id = uuidv4();
        const displayName = data?.displayName || 'New Variable';

        const newVariable: Variable = {
            id,
            displayName,
            officialName: data?.officialName || displayName,
            value: data?.value || '',
            componentType: data?.componentType || 'input',
            instructions: data?.instructions || '',
            defaultSource: data?.defaultSource || 'None',
            isConnected: true,
            isReady: false,
            isDeleted: false,
            color: data?.color || getRandomColor(),
            ...data
        };

        set(state => ({
            variables: { ...state.variables, [id]: newVariable }
        }));

        return id;
    },

    processContent: (editorRef) => {
        const state = get();
        if (!editorRef.current || state.processing) return;

        set({ processing: true });

        try {
            const content = editorRef.current.textContent || '';
            const matches = Array.from(content.matchAll(VARIABLE_PATTERN));

            if (matches.length > 0) {
                const selection = window.getSelection();
                const cursorPosition = selection?.getRangeAt(0)?.startOffset || 0;

                matches.forEach(match => {
                    const [fullMatch, innerContent] = match;
                    let variable = Object.values(state.variables).find(v =>
                        v.displayName === innerContent && !v.isDeleted
                    );

                    if (!variable) {
                        const id = get().addVariable({
                            displayName: innerContent,
                            officialName: innerContent,
                            value: innerContent
                        });
                        variable = get().variables[id];
                    }

                    if (variable) {
                        const walker = document.createTreeWalker(
                            editorRef.current!,
                            NodeFilter.SHOW_TEXT,
                            null
                        );

                        let node: Text | null;
                        while (node = walker.nextNode() as Text) {
                            const index = node.textContent?.indexOf(fullMatch);
                            if (index !== -1) {
                                // Create container for React component
                                const container = document.createElement('span');
                                container.setAttribute('contenteditable', 'false');

                                // Split text and insert chip
                                const beforeText = node.textContent.substring(0, index);
                                const afterText = node.textContent.substring(index + fullMatch.length);

                                const beforeNode = document.createTextNode(beforeText);
                                const afterNode = document.createTextNode(afterText + ' ');

                                const parent = node.parentNode!;
                                parent.insertBefore(beforeNode, node);
                                parent.insertBefore(container, node);
                                parent.insertBefore(afterNode, node);
                                parent.removeChild(node);

                                // Render React component into container
                                ReactDOM.render(
                                    <VariableChip
                                        variable={variable}
                                        isInteractive={false}
                                    />,
                                    container
                                );

                                // Move cursor after chip
                                if (selection) {
                                    const range = document.createRange();
                                    range.setStartAfter(afterNode);
                                    range.collapse(true);
                                    selection.removeAllRanges();
                                    selection.addRange(range);
                                }
                                break;
                            }
                        }
                    }
                });
            }
        } finally {
            set({ processing: false });
        }
    },

    createVariableFromSelection: (name, editorRef) => {
        if (!editorRef.current) return;

        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const id = get().addVariable({
            displayName: name,
            officialName: name,
            value: name
        });

        const variable = get().variables[id];
        if (variable) {
            const container = document.createElement('span');
            container.setAttribute('contenteditable', 'false');

            range.deleteContents();
            range.insertNode(container);

            // Add space after container
            const spaceNode = document.createTextNode(' ');
            container.after(spaceNode);

            // Render React component into container
            ReactDOM.render(
                <VariableChip
                    variable={variable}
                    isInteractive={false}
                />,
                container
            );

            // Move cursor after space
            const newRange = document.createRange();
            newRange.setStartAfter(spaceNode);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
    },

    createVariableAtEnd: (name, editorRef) => {
        if (!editorRef.current) return;

        const id = get().addVariable({
            displayName: name,
            officialName: name,
            value: name
        });

        const variable = get().variables[id];
        if (variable) {
            const container = document.createElement('span');
            container.setAttribute('contenteditable', 'false');

            const spaceNode = document.createTextNode(' ');

            editorRef.current.appendChild(container);
            editorRef.current.appendChild(spaceNode);

            // Render React component into container
            ReactDOM.render(
                <VariableChip
                    variable={variable}
                    isInteractive={false}
                />,
                container
            );

            // Move cursor after space
            const selection = window.getSelection();
            if (selection) {
                const range = document.createRange();
                range.setStartAfter(spaceNode);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    },

    updateVariable: (id, data) => {
        set(state => ({
            variables: {
                ...state.variables,
                [id]: { ...state.variables[id], ...data }
            }
        }));
    },

    deleteVariable: (id) => {
        set(state => ({
            variables: {
                ...state.variables,
                [id]: { ...state.variables[id], isDeleted: true }
            }
        }));
    },

    restoreVariable: (id) => {
        set(state => ({
            variables: {
                ...state.variables,
                [id]: { ...state.variables[id], isDeleted: false }
            }
        }));
    }
}));
