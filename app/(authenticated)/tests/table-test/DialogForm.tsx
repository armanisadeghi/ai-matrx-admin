import React, {useState, useEffect} from 'react';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {DialogFormProps} from '@/types/tableTypes';

const DialogForm: React.FC<DialogFormProps> = (
    {
        open,
        onOpenChange,
        mode,
        columns,
        data,
        onAction,
    }) => {
    const [formData, setFormData] = useState<Record<string, string>>({});

    useEffect(() => {
        if (data && mode !== 'add') {
            const initialData: Record<string, string> = {};
            columns.forEach(column => {
                const key = column.accessor as string;
                initialData[key] = data[key]?.toString() || '';
            });
            setFormData(initialData);
        } else {
            setFormData({});
        }
        console.log("Mode: ", mode);
        console.log("Data: ", data);
        console.log("Columns: ", columns);
    }, [data, columns, mode]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({...prev, [e.target.name]: e.target.value}));
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        onAction(mode, formData);
        onOpenChange(false);
    };

    const renderContent = () => {
        switch (mode) {
            case 'add':
            case 'edit':
                return (
                    <form onSubmit={handleSubmit}>
                        {columns.map((column) => (
                            <div key={column.accessor as string} className="mb-4">
                                <label htmlFor={column.accessor as string} className="block text-sm font-medium">
                                    {column.Header?.toString()}
                                </label>
                                <Input
                                    id={column.accessor as string}
                                    name={column.accessor as string}
                                    value={formData[column.accessor as string] || ''}
                                    onChange={handleInputChange}
                                    className="mt-1 bg-input text-foreground border-border"
                                    disabled={column.accessor === 'id'}
                                />
                            </div>
                        ))}
                        <DialogFooter>
                            <Button type="button" onClick={() => onOpenChange(false)} variant="outline"
                                    className="bg-secondary text-secondary-foreground">
                                Cancel
                            </Button>
                            <Button type="submit"
                                    className="bg-primary text-primary-foreground">
                                {mode === 'add' ? 'Add' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                );
            case 'delete':
                return (
                    <>
                        <p className="text-foreground">Are you sure you want to delete this item?</p>
                        <DialogFooter>
                            <Button onClick={() => onOpenChange(false)} variant="outline"
                                    className="bg-secondary text-secondary-foreground">
                                Cancel
                            </Button>
                            <Button onClick={() => onAction('delete')} variant="destructive"
                                    className="bg-destructive text-destructive-foreground">
                                Delete
                            </Button>
                        </DialogFooter>
                    </>
                );
            case 'view':
                return (
                    <>
                        {columns.map((column) => (
                            <div key={column.accessor as string} className="mb-4">
                                <label className="block text-sm font-medium text-foreground">
                                    {column.Header?.toString()}
                                </label>
                                <p className="mt-1 text-foreground">{formData[column.accessor as string] || ''}</p>
                            </div>
                        ))}
                        <DialogFooter>
                            <Button onClick={() => onOpenChange(false)}
                                    className="bg-primary text-primary-foreground">
                                Close
                            </Button>
                        </DialogFooter>
                    </>
                );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card text-card-foreground border-border">
                <DialogHeader>
                    <DialogTitle
                        className="text-foreground">{mode.charAt(0).toUpperCase() + mode.slice(1)} Item</DialogTitle>
                </DialogHeader>
                {renderContent()}
            </DialogContent>
        </Dialog>
    );
};

export default DialogForm;
