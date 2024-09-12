// DialogForm.tsx
import React from 'react';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Column} from 'react-table';
import {TableData} from "@/app/tests/table-test/ModernTable";

interface DialogFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    modalMode: 'add' | 'edit';
    columns: Column<TableData>[];
    editingRow: TableData | null;
    onSubmit: (formData: Record<string, string>) => void;
}

const DialogForm: React.FC<DialogFormProps> = (
    {
        open,
        onOpenChange,
        modalMode,
        columns,
        editingRow,
        onSubmit,
    }) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card text-card-foreground">
                <DialogHeader>
                    <DialogTitle>{modalMode === 'add' ? 'Add New Item' : 'Edit Item'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const formElement = e.currentTarget;
                    const formData: Record<string, string> = {};
                    columns.forEach(column => {
                        const input = formElement.elements.namedItem(column.id as string) as HTMLInputElement;
                        if (input) {
                            formData[column.id as string] = input.value;
                        }
                    });
                    onSubmit(formData);
                }}>
                    {columns.map(column => (
                        <div key={column.id as string} className="mb-4">
                            <label htmlFor={column.id as string}
                                   className="block text-sm font-medium text-card-foreground">
                                {column.Header?.toString()}
                            </label>
                            <Input
                                id={column.id as string}
                                name={column.id as string}
                                defaultValue={editingRow ? editingRow[column.id as string] : ''}
                                className="bg-card text-card-foreground border-input"
                            />
                        </div>
                    ))}
                    <div className="flex justify-end space-x-2">
                        <Button type="button" onClick={() => onOpenChange(false)} variant="outline"
                                className="bg-primary text-primary-foreground hover:bg-primary/80">
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                            {modalMode === 'add' ? 'Add' : 'Save'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default DialogForm;
