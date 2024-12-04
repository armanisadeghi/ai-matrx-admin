import React, {useCallback, useEffect, useState} from 'react';
import {Editable, Slate, RenderElementProps} from 'slate-react';
import {useChipEditor, ChipElement} from './useChipEditor';
import {cn} from '@/lib/utils';
import {Sparkles, X, Edit, Plus, Trash} from 'lucide-react';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {ChipContextMenuItem} from './ChipContextMenuItem';
import {Editor} from 'slate';


const InlineChromiumBugfix = () => (
    <span
        contentEditable={false}
        style={{fontSize: 0}}
    >
        {String.fromCodePoint(160)}
    </span>
);

const ChipComponent = (
    {
        attributes,
        children,
        element,
    }: RenderElementProps & { element: ChipElement }) => {
    const {removeChip} = useChipEditor();

    return (
        <span
            {...attributes}
            contentEditable={false}
            className={cn(
                "inline-flex items-center gap-1 px-2 py-1 mx-1",
                "rounded-full",
                "text-sm"
            )}
            style={{
                backgroundColor: `${element.variable.color}20`,
                color: element.variable.color
            }}
        >
            <InlineChromiumBugfix/>
            {element.displayName}
            <button
                onClick={(e) => {
                    e.preventDefault();
                    removeChip(element.id);
                }}
                className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
            >
                <X size={14}/>
            </button>
            {children}
            <InlineChromiumBugfix/>
        </span>
    );
};


const Element = (props: RenderElementProps) => {
    const {attributes, children, element} = props;

    switch (element.type) {
        case 'chip':
            return <ChipComponent {...props} element={element as ChipElement}/>;
        default:
            return <p {...attributes}>{children}</p>;
    }
};

export const ChipEditor = () => {
    const {
        editor,
        value,
        handleChange,
        handleKeyDown,
        selectedText,
        insertChip,
        removeChip,
        updateVariable,
    } = useChipEditor();

    // Add state for context menu
    const [showMenu, setShowMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

    // Handle clicking anywhere in the editor container
    const handleContainerClick = useCallback((e: React.MouseEvent) => {
        const editable = e.currentTarget.querySelector('[contenteditable="true"]');
        if (editable) {
            (editable as HTMLElement).focus();
        }
    }, []);

    const handleEditChip = useCallback((chipId: string) => {
        const newName = prompt("Enter new name for the chip:");
        if (newName) {
            updateVariable(chipId, { displayName: newName });
        }
        setShowMenu(false);
    }, [updateVariable]);

    const isChipElement = (node: any): node is ChipElement => {
        return node && typeof node === 'object' && node.type === 'chip';
    };

    // Handle right click
    const handleContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        setMenuPosition({ x: event.clientX, y: event.clientY });
        setShowMenu(true);
    }, []);

    return (
        <div className="w-full max-w-2xl mx-auto">
            <ContextMenu modal={false}>
                <ContextMenuTrigger
                    onContextMenu={handleContextMenu}
                    className="w-full"
                >
                    <Slate editor={editor} initialValue={value} onChange={handleChange}>
                        <div
                            className={cn(
                                "min-h-[200px] p-4 rounded-lg border cursor-text",
                                "bg-background dark:bg-background",
                                "focus-within:ring-2 focus-within:ring-primary",
                                "focus-within:border-transparent transition-colors"
                            )}
                            onClick={handleContainerClick}
                        >
                            <Editable
                                onKeyDown={handleKeyDown}
                                renderElement={Element}
                                placeholder="Start typing..."
                                className="outline-none min-h-[inherit]"
                            />
                        </div>
                    </Slate>
                </ContextMenuTrigger>
                <ContextMenuContent
                    onEscapeKeyDown={() => setShowMenu(false)}
                    onInteractOutside={() => setShowMenu(false)}
                    style={{
                        visibility: showMenu ? 'visible' : 'hidden',
                        position: 'absolute',
                        top: menuPosition.y,
                        left: menuPosition.x,
                    }}
                >
                    {selectedText && (
                        <ContextMenuItem
                            onClick={() => {
                                insertChip(selectedText);
                                setShowMenu(false);
                            }}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            <span>Create Chip</span>
                        </ContextMenuItem>
                    )}

                    {editor.selection && (() => {
                        const [node] = Editor.node(editor, editor.selection);
                        return isChipElement(node);
                    })() && (
                        <>
                            <ContextMenuItem
                                onClick={() => {
                                    const [node] = Editor.node(editor, editor.selection);
                                    if (isChipElement(node)) {
                                        handleEditChip(node.id);
                                    }
                                }}
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit Chip</span>
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                                className="text-red-600 dark:text-red-400"
                                onClick={() => {
                                    const [node] = Editor.node(editor, editor.selection);
                                    if (isChipElement(node)) {
                                        removeChip(node.id);
                                        setShowMenu(false);
                                    }
                                }}
                            >
                                <Trash className="mr-2 h-4 w-4" />
                                <span>Remove Chip</span>
                            </ContextMenuItem>
                        </>
                    )}
                </ContextMenuContent>
            </ContextMenu>

            <div className="mt-4 text-sm text-muted-foreground">
                <p>Tips:</p>
                <ul className="list-disc list-inside">
                    <li>Press Alt+K to convert selected text to a chip</li>
                    <li>Right-click selected text to convert to a chip</li>
                    <li>Type {"{variable name}"} to automatically create a chip</li>
                    <li>Right-click on a chip to edit or remove it</li>
                </ul>
            </div>
        </div>
    );
};
