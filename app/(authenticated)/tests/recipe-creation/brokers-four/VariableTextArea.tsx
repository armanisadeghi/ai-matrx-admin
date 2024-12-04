// components/VariableTextArea.tsx
import {useRef, useState} from 'react';
import {Variable} from './';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";

interface Props {
    text: string;
    variables: Variable[];
    onTextChange: (text: string) => void;
    onCreateVariable: (name: string, position?: { start: number; end: number }) => void;
    onDeleteVariable: (id: string) => void;
    onSetVariableReady: (id: string, isReady: boolean) => void;
}

export const VariableTextArea = (
    {
        text,
        variables,
        onTextChange,
        onCreateVariable,
        onDeleteVariable,
        onSetVariableReady,
    }: Props) => {
    const [selectedText, setSelectedText] = useState("");
    const [showNameDialog, setShowNameDialog] = useState(false);
    const [newVariableName, setNewVariableName] = useState("");
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    const handleContextMenuCreate = () => {
        if (selectedText) {
            setShowNameDialog(true);
        }
    };

    const handleCreateVariable = () => {
        if (newVariableName) {
            const selection = window.getSelection();
            const range = selection?.getRangeAt(0);

            if (range) {
                onCreateVariable(newVariableName, {
                    start: range.startOffset,
                    end: range.endOffset,
                });
            }

            setShowNameDialog(false);
            setNewVariableName("");
        }
    };

    return (
        <div className="flex gap-4">
            <div className="flex-1">
                <ContextMenu>
                    <ContextMenuTrigger>
            <textarea
                ref={textAreaRef}
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
                onSelect={() => {
                    setSelectedText(window.getSelection()?.toString() || "");
                }}
                className="w-full h-64 p-2 border rounded"
            />
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                        <ContextMenuItem onClick={handleContextMenuCreate}>
                            Convert to Variable
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>

                {variables.filter(v => v.isDeleted).length > 0 && (
                    <div className="mt-4">
                        <h3 className="text-sm font-medium">Deleted Variables</h3>
                        <div className="flex gap-2 mt-2">
                            {variables
                                .filter(v => v.isDeleted)
                                .map(v => (
                                    <span
                                        key={v.id}
                                        className="px-2 py-1 text-sm rounded"
                                        style={{backgroundColor: v.color + '40'}}
                                    >
                    {v.name}
                  </span>
                                ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="w-64">
                <Button
                    onClick={() => setShowNameDialog(true)}
                    className="w-full mb-4"
                >
                    Add Variable
                </Button>

                <div className="space-y-2">
                    {variables
                        .filter(v => !v.isDeleted)
                        .map(v => (
                            <div
                                key={v.id}
                                className="p-2 border rounded"
                                style={{borderColor: v.color}}
                            >
                                <div className="flex justify-between items-center">
                                    <span>{v.name}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onDeleteVariable(v.id)}
                                    >
                                        Delete
                                    </Button>
                                </div>
                                <div className="flex items-center mt-2">
                                    <input
                                        type="checkbox"
                                        checked={v.isReady}
                                        onChange={(e) => onSetVariableReady(v.id, e.target.checked)}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">Ready</span>
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Name Your Variable</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={newVariableName}
                        onChange={(e) => setNewVariableName(e.target.value)}
                        placeholder="Enter variable name"
                    />
                    <DialogFooter>
                        <Button onClick={handleCreateVariable}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
