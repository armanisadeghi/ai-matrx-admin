'use client';

import React, {useCallback, useRef, useState, useEffect} from 'react';
import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger} from "@/components/ui/context-menu";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import { useVariablesStore } from '@/app/contexts/old/useVariablesStore';

const VARIABLE_PATTERN = /\{([^}]+)\}!/g;

const getRandomColor = () => {
    const colors = [
        'rgb(239 68 68)', // red
        'rgb(34 197 94)', // green
        'rgb(59 130 246)', // blue
        'rgb(168 85 247)', // purple
        'rgb(234 179 8)',  // yellow
        'rgb(236 72 153)', // pink
    ];
    return colors[Math.floor(Math.random() * colors.length)];
};

// https://claude.ai/chat/3180852f-9920-43b4-ba18-68caa017acda

export const IntelligentEditor = () => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [showNameDialog, setShowNameDialog] = useState(false);
    const [selectedText, setSelectedText] = useState('');
    const [newVarName, setNewVarName] = useState('');
    const {
        variables,
        addVariable,
        updateEditorContent,
        updateEditorSelection,
    } = useVariablesStore();
    const processingRef = useRef(false);
    const cursorPositionRef = useRef<number | null>(null);

    const preserveCursorPosition = useCallback(() => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            cursorPositionRef.current = range.startOffset;
        }
    }, []);

    const restoreCursorPosition = useCallback(() => {
        if (cursorPositionRef.current === null || !editorRef.current) return;

        const selection = window.getSelection();
        const range = document.createRange();
        let currentPos = 0;
        let targetNode: Node | null = null;
        let targetOffset = 0;

        const walkNodes = (node: Node) => {
            if (currentPos >= cursorPositionRef.current!) return true;

            if (node.nodeType === Node.TEXT_NODE) {
                const length = node.textContent?.length || 0;
                if (currentPos + length >= cursorPositionRef.current!) {
                    targetNode = node;
                    targetOffset = cursorPositionRef.current! - currentPos;
                    return true;
                }
                currentPos += length;
            }

            const childNodes = Array.from(node.childNodes);
            for (const child of childNodes) {
                if (walkNodes(child)) return true;
            }
            return false;
        };

        walkNodes(editorRef.current);

        if (targetNode) {
            range.setStart(targetNode, targetOffset);
            range.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
    }, []);

    const processVariables = useCallback(() => {
        if (!editorRef.current || processingRef.current) return;
        processingRef.current = true;

        const content = editorRef.current.innerText;
        preserveCursorPosition();

        let processedContent = content;
        const matches = Array.from(content.matchAll(VARIABLE_PATTERN));
        let offset = 0;

        matches.forEach(match => {
            const [fullMatch, innerContent] = match;
            const startIndex = match.index! + offset;

            // Find existing variable or create new one
            let variable = Object.values(variables).find(v =>
                v.displayName === innerContent && !v.isDeleted
            );

            if (!variable) {
                // Create new variable and wait for it to be available
                const id = addVariable({
                    displayName: innerContent,
                    officialName: innerContent,
                    value: innerContent,
                    color: getRandomColor() // Add this function at the top of your file
                });
                variable = {
                    id,
                    displayName: innerContent,
                    officialName: innerContent,
                    value: innerContent,
                    color: getRandomColor(),
                    isReady: false,
                    isDeleted: false,
                    componentType: 'input',
                    instructions: '',
                    defaultSource: 'None',
                    isConnected: true,
                };
            }

            // Only proceed if we have a valid variable
            if (variable) {
                const replacement = `<span 
                class="variable-chip inline-flex items-center px-2 py-0.5 rounded-md mx-1" 
                style="background-color: ${variable.color}20; color: ${variable.color}; border: 1px solid ${variable.color}40"
                data-variable-id="${variable.id}"
                contenteditable="false"
            >${variable.displayName}${variable.isReady ? '✓' : ''}</span>`;

                processedContent = processedContent.slice(0, startIndex) +
                    replacement +
                    processedContent.slice(startIndex + fullMatch.length);

                offset += replacement.length - fullMatch.length;
            }
        });

        if (processedContent !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = processedContent;
            updateEditorContent(content);
            restoreCursorPosition();
        }

        processingRef.current = false;
    }, [variables, addVariable, updateEditorContent, preserveCursorPosition, restoreCursorPosition]);

    const handleInput = useCallback((event: React.FormEvent<HTMLDivElement>) => {
        requestAnimationFrame(() => {
            if (!processingRef.current) {
                processVariables();
            }
        });
    }, [processVariables]);

    const handleCreateVariable = useCallback(() => {
        if (!selectedText) return;
        setNewVarName(selectedText);
        setShowNameDialog(true);
    }, [selectedText]);

    const createVariable = useCallback(() => {
        if (!selectedText || !editorRef.current) return;

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const text = `{${newVarName || selectedText}}! `;

            const textNode = document.createTextNode(text);
            range.deleteContents();
            range.insertNode(textNode);

            // Move cursor after the inserted variable
            range.setStartAfter(textNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);

            processVariables();
        }

        setShowNameDialog(false);
        setNewVarName('');
        setSelectedText('');
    }, [selectedText, newVarName, processVariables]);

    useEffect(() => {
        processVariables();
    }, [processVariables]);

    return (
        <div className="space-y-4">
            <ContextMenu>
                <ContextMenuTrigger>
                    <div
                        ref={editorRef}
                        className="min-h-[200px] p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        contentEditable
                        onInput={handleInput}
                        onSelect={() => {
                            const selection = window.getSelection();
                            setSelectedText(selection?.toString().trim() || '');
                        }}
                    />
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onClick={handleCreateVariable}>
                        Convert to Variable
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Name Your Variable</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={newVarName}
                        onChange={(e) => setNewVarName(e.target.value)}
                        placeholder="Enter variable name"
                    />
                    <DialogFooter>
                        <Button onClick={createVariable}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-2">Disconnected Variables</h3>
                <div className="flex flex-wrap gap-2">
                    {Object.values(variables)
                        .filter(v => v.isDeleted)
                        .map(variable => (
                            <span
                                key={variable.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-md"
                                style={{
                                    backgroundColor: `${variable.color}20`,
                                    color: variable.color,
                                    border: `1px solid ${variable.color}40`
                                }}
                            >
                                {variable.displayName}
                            </span>
                        ))}
                </div>
            </div>
        </div>
    );
};
