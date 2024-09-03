import React, {useState} from 'react';
import { z } from 'zod';
import {PlusCircle, Loader2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from "@/components/ui/dialog";
import {ScrollArea} from '@/components/ui/scroll-area';
import {GenericForm} from './GenericForm';

interface GenericManagementProps<T> {
    items: T[];
    schema: z.ZodType<any, any>;
    fields: Record<string, {
        type: 'text' | 'textarea' | 'select';
        label: string;
        options?: { value: string; label: string }[]
    }>;
    getItemId: (item: T) => string;
    getItemName: (item: T) => string;
    onItemSelect: (id: string) => void;
    onSearch: (query: string, searchAll: boolean) => void;
    onSubmit: (data: any) => void;
    onDelete: (id: string) => void;
    loading: boolean;
    error: string | null;
    title: string;
    SidebarComponent: React.ComponentType<any>;
    FormComponent: React.ComponentType<any>;
}

const GenericManagement = <T extends Record<string, any>>(
    {
        items,
        schema,
        fields,
        getItemId,
        getItemName,
        onItemSelect,
        onSearch,
        onSubmit,
        onDelete,
        loading,
        error,
        title,
        SidebarComponent,
        FormComponent
    }: GenericManagementProps<T>) => {
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleItemSelect = (id: string) => {
        setSelectedItemId(id);
        setIsEditing(false);
        onItemSelect(id);
    };

    const handleSubmit = async (data: any) => {
        await onSubmit(data);
        setIsEditing(false);
    };

    const handleDelete = () => {
        if (selectedItemId) {
            onDelete(selectedItemId);
            setSelectedItemId(null);
            setIsDeleteDialogOpen(false);
        }
    };

    const selectedItem = items.find(item => getItemId(item) === selectedItemId);

    if (loading) return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin"/>
        </div>
    );

    if (error) return (
        <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
    );

    return (
        <div className="flex h-screen">
            <SidebarComponent
                items={items}
                getItemId={getItemId}
                getItemName={getItemName}
                onItemSelect={handleItemSelect}
                onSearch={onSearch}
                className="flex-shrink-0"
            />
            <div className="flex-grow p-4 overflow-hidden">
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle>{title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-hidden flex flex-col">
                        <div className="mb-4">
                            <Button onClick={() => {
                                setSelectedItemId(null);
                                setIsEditing(true);
                            }}>
                                <PlusCircle className="mr-2 h-4 w-4"/> Add New Item
                            </Button>
                        </div>
                        <div className="flex-grow overflow-hidden flex flex-col">
                            <GenericForm
                                schema={schema}
                                initialData={selectedItem}
                                onSubmit={handleSubmit}
                                isEditing={isEditing}
                                onEdit={() => setIsEditing(true)}
                                onDelete={() => setIsDeleteDialogOpen(true)}
                                onCancel={() => {
                                    setIsEditing(false);
                                    if (!selectedItemId) {
                                        setSelectedItemId(null);
                                    }
                                }}
                                fields={fields}
                            />
                            <ScrollArea className="mt-4 flex-grow">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {Object.keys(fields).map((key) => (
                                                <TableHead key={key}>{fields[key].label}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map(item => (
                                            <TableRow
                                                key={getItemId(item)}
                                                className="cursor-pointer hover:bg-gray-100"
                                                onClick={() => handleItemSelect(getItemId(item))}
                                            >
                                                {Object.keys(fields).map((key) => (
                                                    <TableCell key={key}>{item[key]}</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                    </DialogHeader>
                    <div>
                        Are you sure you want to delete this item?
                        {selectedItem && (
                            <div className="mt-2">
                                {Object.entries(fields).map(([key, config]) => (
                                    <p key={key}><strong>{config.label}:</strong> {selectedItem[key]}</p>
                                ))}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default GenericManagement;
