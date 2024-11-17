'use client';

import * as React from 'react';
import {useQuickReference} from '@/lib/redux/entity/hooks/useQuickReference';
import {EntityData, EntityKeys} from '@/types/entityTypes';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from '@/components/ui/card';
import {
    ResizablePanel,
    ResizablePanelGroup,
    ResizableHandle,
} from '@/components/ui/resizable';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Input} from '@/components/ui/input';
import {toast} from '@/components/ui';
import {Plus, CheckSquare, Trash, Save, X} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {OperationCallback} from '@/lib/redux/entity/types';
import {Callback} from "@/utils/callbackManager";

interface EntityTestViewProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
}

type FormMode = 'view' | 'edit' | 'create' | 'multi';

export function EntityTestView<TEntity extends EntityKeys>(
    {
        entityKey
    }: EntityTestViewProps<TEntity>) {
    const {
        // Metadata
        entityDisplayName,
        fieldInfo,
        // Quick Reference Data
        quickReferenceRecords,
        // Selection Management
        selectedRecordIds,
        selectedRecords,
        activeRecord,
        selectionMode,
        // Selection Utilities
        isSelected,
        handleSelection,
        toggleSelectionMode,
        clearSelection,
        // Record Operations
        createRecord,
        updateRecord,
        deleteRecord,
        // UI States
        loadingState,
        getRecordIdByRecord,
        getDisplayValue,
        handleSingleSelection,
    } = useQuickReference(entityKey);

    const [sidebarSize, setSidebarSize] = React.useState(25);
    const [formData, setFormData] = React.useState<Partial<EntityData<TEntity>>>({});
    const [mode, setMode] = React.useState<FormMode>('view');

    // Reset form when active record changes
    React.useEffect(() => {
        if (activeRecord && mode !== 'create') {
            setFormData(activeRecord);
            setMode(selectionMode === 'multiple' ? 'multi' : 'view');
        }
    }, [activeRecord, selectionMode]);


    const handleCreateNew = () => {
        clearSelection();
        const defaultValues = fieldInfo.reduce((acc, field) => ({
            ...acc,
            [field.name]: field.defaultValue
        }), {} as Partial<EntityData<TEntity>>);
        setFormData(defaultValues);
        setMode('create');
    };

    const handleSave = () => {
        const callback: Callback<{ success: boolean; error?: any }> = (result) => {
            if (result.success) {
                if (mode === 'create') {
                    toast({
                        title: "Created",
                        description: "New record created successfully",
                        variant: "success",
                    });
                } else {
                    toast({
                        title: "Updated",
                        description: "Record updated successfully",
                        variant: "success",
                    });
                }
                setMode('view');
            } else {
                toast({
                    title: "Error",
                    description: result.error?.message || "An error occurred",
                    variant: "destructive",
                });
            }
        };

        if (mode === 'create') {
            createRecord(formData, callback);
        } else if (mode === 'edit' && activeRecord) {
            const recordId = getRecordIdByRecord(activeRecord);
            if (!recordId) return;
            updateRecord(recordId, formData, callback);
        }
    };

    const handleDelete = () => {
        if (!activeRecord) return;
        const recordId = getRecordIdByRecord(activeRecord);
        if (!recordId) return;

        const callback: Callback<{ success: boolean; error?: any }> = (result) => {
            if (result.success) {
                toast({
                    title: "Deleted",
                    description: "Record deleted successfully",
                });
                clearSelection();
            } else {
                toast({
                    title: "Error",
                    description: result.error?.message || "An error occurred",
                    variant: "destructive",
                });
            }
        };

        deleteRecord(recordId, callback);
    };

    const handleCancel = () => {
        if (activeRecord) {
            setFormData(activeRecord);
            setMode('view');
        } else {
            setFormData({});
            setMode('view');
        }
    };

    const getCardClassName = (recordKey: string) => {
        const baseClasses = "cursor-pointer transition-colors hover:bg-accent/50";
        const isMultiple = selectionMode === 'multiple';
        return `${baseClasses} ${
            isSelected(recordKey)
            ? `border-primary ${isMultiple ? 'bg-accent' : 'border-2 bg-accent'}`
            : 'border-transparent'
        }`;
    };

    const renderField = (field: typeof fieldInfo[0]) => {
        if (field.isPrimaryKey) return null;

        const isReadOnly = mode === 'view';
        const value = formData[field.name] ?? '';

        return (
            <div key={field.name} className="space-y-2">
                <label className="text-sm font-medium">
                    <span>{field.displayName}</span>
                    {field.isRequired && (
                        <span className="text-destructive ml-1">*</span>
                    )}
                </label>
                {field.description && (
                    <p className="text-xs text-muted-foreground">
                        {field.description}
                    </p>
                )}
                <Input
                    value={value}
                    onChange={(e) => {
                        if (!isReadOnly) {
                            setFormData(prev => ({
                                ...prev,
                                [field.name]: e.target.value
                            }));
                        }
                    }}
                    disabled={isReadOnly}
                    placeholder={field.defaultValue as string || ''}
                    maxLength={field.maxLength}
                />
            </div>
        );
    };

    const renderMultiSelectView = () => (
        <Accordion type="single" collapsible className="w-full">
            {selectedRecords.map(record => {
                const recordId = getRecordIdByRecord(record);
                if (!recordId) return null;

                return (
                    <AccordionItem key={recordId} value={recordId}>
                        <AccordionTrigger>{getDisplayValue(record)}</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-4 p-4">
                                {fieldInfo.map(field => {
                                    if (field.isPrimaryKey) return null;
                                    return (
                                        <div key={field.name} className="space-y-1">
                                            <label className="text-sm font-medium">{field.displayName}</label>
                                            <div className="text-sm">{record[field.name] || '-'}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                );
            })}
        </Accordion>
    );

    const renderFormContent = () => {
        if (mode === 'multi') {
            return renderMultiSelectView();
        }

        return (
            <div className="space-y-6">
                <div className="space-y-4">
                    {fieldInfo.map(renderField)}
                </div>
                {mode !== 'view' && (
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={handleCancel}>
                            <X className="h-4 w-4 mr-1"/>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            <Save className="h-4 w-4 mr-1"/>
                            {mode === 'create' ? 'Create' : 'Save'}
                        </Button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-[calc(100vh-4rem)]">
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel
                    defaultSize={sidebarSize}
                    minSize={10}
                    maxSize={50}
                    onResize={setSidebarSize}
                >
                    <div className="h-full flex flex-col border-r">
                        <div className="p-4 border-b">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex gap-2">
                                    <Button
                                        onClick={toggleSelectionMode}
                                        size="sm"
                                        variant={selectionMode === 'multiple' ? "secondary" : "outline"}
                                    >
                                        <CheckSquare className="h-4 w-4 mr-1"/>
                                        {selectionMode === 'multiple' ? 'Cancel Multi' : 'Multi'}
                                    </Button>
                                    <Button
                                        onClick={handleCreateNew}
                                        size="sm"
                                    >
                                        <Plus className="h-4 w-4 mr-1"/>
                                        New
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <ScrollArea className="flex-grow">
                            <div className="p-2 space-y-2">
                                {quickReferenceRecords.map(ref => (
                                    <Card
                                        key={ref.recordKey}
                                        className={getCardClassName(ref.recordKey)}
                                        onClick={() => {
                                            if (selectionMode === 'multiple') {
                                                toggleSelectionMode();
                                            } else {
                                                handleSingleSelection(ref.recordKey);
                                            }
                                        }}
                                    >
                                        <CardContent className="p-3">
                                            <div className="flex items-center gap-2">
                                                {selectionMode === 'multiple' && (
                                                    <Checkbox
                                                        checked={isSelected(ref.recordKey)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                )}
                                                <div className="text-sm">
                                                    {ref.displayValue}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </ResizablePanel>

                <ResizableHandle/>

                <ResizablePanel defaultSize={100 - sidebarSize}>
                    <ScrollArea className="h-full">
                        <div className="p-6">
                            {(activeRecord || mode === 'create') ? (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h1 className="text-2xl font-bold">
                                            {mode === 'create'
                                             ? `New ${entityDisplayName}`
                                             : mode === 'multi'
                                               ? `${selectedRecordIds.length} Selected`
                                               : getDisplayValue(activeRecord!)}
                                        </h1>
                                        {mode === 'view' && !selectionMode && (
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => setMode('edit')}
                                                    size="sm"
                                                >
                                                    Edit
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="destructive" size="sm">
                                                            <Trash className="h-4 w-4 mr-1"/>
                                                            Delete
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Record</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure? This cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => {
                                                                    if (!activeRecord) return;
                                                                    const recordId = getRecordIdByRecord(activeRecord);
                                                                    if (!recordId) return;

                                                                    const callback: Callback<{
                                                                        success: boolean;
                                                                        error?: any
                                                                    }> = (result) => {
                                                                        if (result.success) {
                                                                            toast({
                                                                                title: "Deleted",
                                                                                description: "Record deleted successfully",
                                                                            });
                                                                        } else {
                                                                            toast({
                                                                                title: "Error",
                                                                                description: "Failed to delete the record",
                                                                                variant: "destructive",
                                                                            });
                                                                            console.error(result.error);
                                                                        }
                                                                    };

                                                                    deleteRecord(recordId, callback);
                                                                }}
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        )}
                                    </div>
                                    {renderFormContent()}
                                </div>
                            ) : (
                                 <div className="h-full flex items-center justify-center">
                                     <div className="text-center">
                                         <h2 className="text-xl font-semibold mb-2">
                                             No Record Selected
                                         </h2>
                                         <p className="text-muted-foreground">
                                             Select a record to view or edit details
                                         </p>
                                     </div>
                                 </div>
                             )}
                        </div>
                    </ScrollArea>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
