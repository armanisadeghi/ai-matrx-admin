// IntelligentEditor.tsx
'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVariablesStoreFive } from '@/app/contexts/useVariablesStoreFive';
import { VariableChip } from './VariableChip';

export const IntelligentEditor = () => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [showNameDialog, setShowNameDialog] = useState(false);
    const [selectedText, setSelectedText] = useState('');
    const [newVarName, setNewVarName] = useState('');
    const [isCreatingNew, setIsCreatingNew] = useState(false);

    const {
        variables,
        processContent,
        createVariableFromSelection,
        createVariableAtEnd,
        deleteVariable,
        restoreVariable,
        updateVariable
    } = useVariablesStoreFive();

    const handleInput = useCallback(() => {
        requestAnimationFrame(() => {
            processContent({ current: editorRef.current });
        });
    }, [processContent]);

    const handleCreateVariable = useCallback(() => {
        if (!selectedText) return;
        setNewVarName(selectedText);
        setShowNameDialog(true);
    }, [selectedText]);

    const createVariable = useCallback(() => {
        if (!newVarName) return;

        if (isCreatingNew) {
            createVariableAtEnd(newVarName, { current: editorRef.current });
        } else {
            createVariableFromSelection(newVarName, { current: editorRef.current });
        }

        setShowNameDialog(false);
        setNewVarName('');
        setSelectedText('');
        setIsCreatingNew(false);
    }, [newVarName, isCreatingNew, createVariableAtEnd, createVariableFromSelection]);

    const handleNewVariable = useCallback(() => {
        setIsCreatingNew(true);
        setShowNameDialog(true);
    }, []);

    useEffect(() => {
        processContent({ current: editorRef.current });
    }, [processContent]);

    const activeVariables = Object.values(variables).filter(v => !v.isDeleted);
    const deletedVariables = Object.values(variables).filter(v => v.isDeleted);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
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
                </div>

                <div className="space-y-4">
                    <Button onClick={handleNewVariable} className="w-full">
                        Add Variable
                    </Button>

                    <div className="p-4 border rounded-lg">
                        <h3 className="text-sm font-medium mb-2">Available Variables</h3>
                        <div className="flex flex-col gap-2">
                            {activeVariables.map(variable => (
                                <VariableChip
                                    key={variable.id}
                                    variable={variable}
                                    onDelete={deleteVariable}
                                />
                            ))}
                        </div>
                    </div>

                    {deletedVariables.length > 0 && (
                        <div className="p-4 border rounded-lg">
                            <h3 className="text-sm font-medium mb-2">Disconnected Variables</h3>
                            <div className="flex flex-col gap-2">
                                {deletedVariables.map(variable => (
                                    <VariableChip
                                        key={variable.id}
                                        variable={variable}
                                        onRestore={restoreVariable}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {isCreatingNew ? 'Create New Variable' : 'Name Your Variable'}
                        </DialogTitle>
                    </DialogHeader>
                    <Input
                        value={newVarName}
                        onChange={(e) => setNewVarName(e.target.value)}
                        placeholder="Enter variable name"
                        autoFocus
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNameDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={createVariable}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
