import { useState, useCallback } from 'react';
import { Range, createEditor, Descendant, Element as SlateElement, Transforms, Editor, BaseEditor } from 'slate';
import { ReactEditor, withReact } from 'slate-react';
import { withHistory, HistoryEditor } from 'slate-history';
import { v4 as uuidv4 } from 'uuid';
import { Text } from 'slate';

const VARIABLE_PATTERN = /\{([^}]+)\}/g;

export interface Variable {
    id: string;
    displayName: string;
    officialName: string;
    value: string;
    componentType: string;
    instructions: string;
    defaultSource: string;
    sourceDetails?: string;
    isConnected: boolean;
    isReady: boolean;
    isDeleted: boolean;
    color: string;
    position?: {
        start: number;
        end: number;
    };
}

export interface ChipElement {
    type: 'chip';
    id: string;
    displayName: string;
    variable: Variable;
    children: [{ text: '' }];
}

declare module 'slate' {
    interface CustomTypes {
        Editor: BaseEditor & ReactEditor & HistoryEditor;
        Element: CustomElement;
        Text: { text: string };
    }
}
export interface ParagraphElement {
    type: 'paragraph';
    children: Descendant[];
}

export type CustomElement = ChipElement | ParagraphElement;


const createDefaultVariable = (text: string): Variable => ({
    id: uuidv4(),
    displayName: text,
    officialName: text.toLowerCase().replace(/\s+/g, '_'),
    value: text,
    componentType: 'text',
    instructions: '',
    defaultSource: 'user',
    isConnected: false,
    isReady: true,
    isDeleted: false,
    color: '#6366f1',
    position: undefined,
});

const initialValue: Descendant[] = [
    {
        type: 'paragraph',
        children: [{ text: 'Enter your recipe content here ' }],
    }
];
const withInlines = (editor: Editor) => {
    const { isInline } = editor;

    editor.isInline = element => {
        return element.type === 'chip' ? true : isInline(element);
    };

    return editor;
};

const normalizeVariableName = (name: string): string => {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
};

export const useChipEditor = () => {
    const [editor] = useState(() =>
        withInlines(withHistory(withReact(createEditor())))
    );

    const [value, setValue] = useState<Descendant[]>(initialValue);
    const [variables, setVariables] = useState<Variable[]>([]);
    const [chips, setChips] = useState<ChipElement[]>([]);

    // Update chips and variables tracking
    const updateChipsFromValue = useCallback((value: Descendant[]) => {
        const newChips: ChipElement[] = [];
        const traverse = (nodes: Descendant[]) => {
            nodes.forEach((node) => {
                if (SlateElement.isElement(node) && node.type === 'chip') {
                    newChips.push(node as ChipElement);
                }
            });
        };
        traverse(value);
        setChips(newChips);

        // Update variables state based on chips
        const newVariables = newChips.map(chip => chip.variable);
        setVariables(newVariables);
    }, []);

    const insertChip = useCallback(
        (text: string, customVariable?: Partial<Variable>) => {
            const { selection } = editor;
            const position = selection ? {
                start: selection.anchor.offset,
                end: selection.focus.offset,
            } : undefined;

            const variable: Variable = {
                ...createDefaultVariable(text),
                position,
                ...customVariable,
            };

            const chip: ChipElement = {
                type: 'chip',
                id: variable.id,
                displayName: variable.displayName,
                variable,
                children: [{ text: '' }],
            };

            const isCollapsed = selection && Range.isCollapsed(selection);

            if (isCollapsed) {
                Transforms.insertNodes(editor, chip);
            } else {
                Transforms.wrapNodes(editor, chip, { split: true });
                Transforms.collapse(editor, { edge: 'end' });
            }

            setVariables(prev => [...prev, variable]);
            return chip;
        },
        [editor]
    );

    // Update existing chip/variable
    const updateVariable = useCallback((id: string, updates: Partial<Variable>) => {
        setVariables(prev => prev.map(v =>
            v.id === id ? { ...v, ...updates } : v
        ));

        // Update the chip in the editor
        const path = findChipPath(editor, id);
        if (path) {
            const newProperties: Partial<ChipElement> = {
                displayName: updates.displayName || undefined,
                variable: { ...variables.find(v => v.id === id)!, ...updates },
            };
            Transforms.setNodes(editor, newProperties, { at: path });
        }
    }, [editor, variables]);

    // Remove chip and variable
    const removeChip = useCallback(
        (id: string) => {
            const path = findChipPath(editor, id);
            if (path) {
                Transforms.removeNodes(editor, { at: path });
                setVariables(prev => prev.filter(v => v.id !== id));
            }
        },
        [editor]
    );

    // Find chip path helper
    const findChipPath = useCallback(
        (editor: Editor, id: string) => {
            const [match] = Editor.nodes(editor, {
                match: (n) =>
                    SlateElement.isElement(n) && n.type === 'chip' && n.id === id,
            });
            return match ? match[1] : null;
        },
        []
    );

    // Context menu state and handlers
    const [contextMenuPosition, setContextMenuPosition] = useState<{
        x: number;
        y: number;
    } | null>(null);
    const [selectedText, setSelectedText] = useState<string>('');

    // Keyboard shortcuts
    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.altKey && event.key === 'k') {
                event.preventDefault();
                const selection = editor.selection;
                if (selection && !Editor.string(editor, selection).trim()) {
                    return;
                }

                const text = Editor.string(editor, selection!);
                insertChip(text);
            }
        },
        [editor, insertChip]
    );

    // Context menu handler
    const handleContextMenu = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault();

            const selection = editor.selection;
            if (selection && !Range.isCollapsed(selection)) {
                const text = Editor.string(editor, selection);
                if (text.trim()) {
                    setSelectedText(text);
                    setContextMenuPosition({ x: event.clientX, y: event.clientY });
                }
            }
        },
        [editor]
    );

    const closeContextMenu = useCallback(() => {
        setContextMenuPosition(null);
        setSelectedText('');
    }, []);

    // Persistence
    const saveToStorage = useCallback((newValue: Descendant[]) => {
        localStorage.setItem('editor-content', JSON.stringify(newValue));
        localStorage.setItem('editor-variables', JSON.stringify(variables));
    }, [variables]);

    const containsVariablePattern = useCallback((text: string) => {
        return VARIABLE_PATTERN.test(text);
    }, []);

    // Function to convert text patterns to chips
    const convertPatternsToChips = useCallback((node: Text) => {
        if (!Text.isText(node) || !containsVariablePattern(node.text)) {
            return;
        }

        const matches = Array.from(node.text.matchAll(VARIABLE_PATTERN));

        // Process matches in reverse to maintain correct indices
        for (let i = matches.length - 1; i >= 0; i--) {
            const match = matches[i];
            const [fullMatch, variableName] = match;
            const start = match.index!;
            const end = start + fullMatch.length;

            try {
                // Split the text node at the match boundaries
                const path = ReactEditor.findPath(editor, node);
                const range = {
                    anchor: { path, offset: start },
                    focus: { path, offset: end },
                };

                // Create and insert the chip
                Transforms.select(editor, range);
                insertChip(variableName.trim(), {
                    position: { start, end }
                });
            } catch (error) {
                console.error('Error converting pattern to chip:', error);
            }
        }
    }, [editor, insertChip, containsVariablePattern]);

    const handleChange = useCallback((newValue: Descendant[]) => {
        setValue(newValue);
        updateChipsFromValue(newValue);

        // Check for patterns in all text nodes
        for (const [node] of Editor.nodes(editor, {
            match: n => Text.isText(n) && containsVariablePattern(n.text),
        })) {
            if (Text.isText(node)) {
                convertPatternsToChips(node);
            }
        }

        saveToStorage(newValue);
    }, [editor, setValue, updateChipsFromValue, convertPatternsToChips, saveToStorage]);

    return {
        editor,
        value,
        chips,
        variables,
        setValue,
        insertChip,
        updateVariable,
        removeChip,
        handleKeyDown,
        handleContextMenu,
        contextMenuPosition,
        selectedText,
        closeContextMenu,
        updateChipsFromValue,
        saveToStorage,
        handleChange,
    };
};
