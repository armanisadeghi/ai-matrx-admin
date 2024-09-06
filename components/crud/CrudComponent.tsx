import React, {useState, useEffect} from 'react';
import {z} from 'zod';
import {CrudTable} from "./CrudTable";
import {CrudForm} from "./CrudForm";
import {CrudSidebar} from "./CrudSidebar";
import {MatrixDeleteDialog} from "@/components/matrx/delete-dialog";
import {Button} from '@/components/ui/button';
import {PlusCircle, Loader2} from 'lucide-react';
import {Alert, AlertDescription} from '@/components/ui/alert';

interface CrudComponentProps<T extends z.ZodType<any, any>> {
    schema: T;
    allIdAndNames: { id: string; name: string }[];
    items: z.infer<T>[];
    fields: Record<string, {
        type: 'text' | 'textarea' | 'select';
        label: string;
        options?: { value: string; label: string }[]
    }>;
    getItemId: (item: z.infer<T>) => string;
    getItemName: (item: z.infer<T>) => string;
    onItemSelect: (id: string) => void;
    onSearch: (query: string, searchAll: boolean) => void;
    onSubmit: (data: z.infer<T>) => void;
    onDelete: (id: string) => void;
    onDeleteMany: (ids: string[]) => void;
    loading: boolean;
    error: string | null;
    totalCount: number;
    currentPage: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (itemsPerPage: number) => void;
}

export function CrudComponent<T extends z.ZodType<any, any>>(
    {
        schema,
        allIdAndNames,
        items,
        fields,
        getItemId,
        getItemName,
        onItemSelect,
        onSearch,
        onSubmit,
        onDelete,
        onDeleteMany,  // Use deleteMany prop
        loading,
        error,
        totalCount,
        currentPage,
        itemsPerPage,
        onPageChange,
        onItemsPerPageChange,
    }: CrudComponentProps<T>) {
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    const handleDeleteManyItems = (ids: string[]) => {
        onDeleteMany(ids);
        setSelectedItemId(null);
        setIsDeleteDialogOpen(false);
    };

    const selectedItem = items.find(item => getItemId(item) === selectedItemId);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin"/>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="flex h-full overflow-hidden">
            <CrudSidebar
                allIdAndNames={allIdAndNames}
                onItemSelect={handleItemSelect}
                onSearch={onSearch}
                isMobile={isMobile}
            />
            <div className="flex-grow flex flex-col overflow-hidden">
                <div className="flex-grow overflow-auto p-4">
                    <div className="mb-4">
                        <Button onClick={() => {
                            setSelectedItemId(null);
                            setIsEditing(true);
                        }}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Add New
                        </Button>
                        <Button onClick={() => handleDeleteManyItems(selectedItemId ? [selectedItemId] : [])}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Delete Selected
                        </Button>
                    </div>
                    <div className="overflow-auto">
                        <CrudTable
                            items={items}
                            fields={fields}
                            getItemId={getItemId}
                            onItemSelect={handleItemSelect}
                            totalCount={totalCount}
                            currentPage={currentPage}
                            itemsPerPage={itemsPerPage}
                            onPageChange={onPageChange}
                            onItemsPerPageChange={onItemsPerPageChange}
                        />
                    </div>
                </div>
                <div className="flex-shrink-0 p-4 border-t">
                    <CrudForm
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
                </div>
            </div>
            <MatrixDeleteDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                item={selectedItem}
                fields={fields}
            />
        </div>

    );
}
