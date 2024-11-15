// EntityFormPanel.tsx
import * as React from 'react';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {EntityData, EntityKeys} from '@/types/entityTypes';
import {useQuickReference} from '@/lib/redux/entity/hooks/useQuickReference';
import {Save, X, Trash} from 'lucide-react';
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
import {toast} from '@/components/ui';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";

interface EntityFormPanelProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    selectedId?: string;
    selectedIds?: string[];
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
}

type FormMode = 'view' | 'edit' | 'create' | 'multi';

export function EntityFormPanel<TEntity extends EntityKeys>(
    {
        entityKey,
        selectedId,
        selectedIds,
        onCreateSuccess,
        onUpdateSuccess,
        onDeleteSuccess
    }: EntityFormPanelProps<TEntity>) {
    const {
        entityDisplayName,
        fieldInfo,
        selectedRecords,
        activeRecord,
        createRecord,
        updateRecord,
        deleteRecord,
        getRecordIdByRecord,
        getDisplayValue,
        selectionMode,
    } = useQuickReference(entityKey);

    const [formData, setFormData] = React.useState<Partial<EntityData<TEntity>>>({});
    const [mode, setMode] = React.useState<FormMode>('view');

    // Reset form when selection changes
    React.useEffect(() => {
        if (activeRecord && mode !== 'create') {
            setFormData(activeRecord);
            setMode(selectionMode === 'multiple' ? 'multi' : 'view');
        }
    }, [activeRecord, selectionMode]);

    const handleSave = () => {
        const callback = (result: { success: boolean; error?: any }) => {
            if (result.success) {
                toast({
                    title: mode === 'create' ? "Created" : "Updated",
                    description: `Record ${mode === 'create' ? 'created' : 'updated'} successfully`,
                    variant: "success",
                });
                setMode('view');
                if (mode === 'create') {
                    onCreateSuccess?.();
                } else {
                    onUpdateSuccess?.();
                }
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
        } else if (mode === 'edit' && selectedId) {
            updateRecord(selectedId, formData, callback);
        }
    };

    const handleDelete = () => {
        if (!selectedId) return;

        deleteRecord(selectedId, (result) => {
            if (result.success) {
                toast({
                    title: "Deleted",
                    description: "Record deleted successfully",
                });
                onDeleteSuccess?.();
            } else {
                toast({
                    title: "Error",
                    description: result.error?.message || "An error occurred",
                    variant: "destructive",
                });
            }
        });
    };

    const renderField = (field: typeof fieldInfo[0], record?: EntityData<TEntity>) => {
        if (field.isPrimaryKey) return null;

        const isReadOnly = mode === 'view';
        const value = record ? record[field.name] : formData[field.name] ?? '';

        return (
            <div key={field.name} className="space-y-2">
                <label className="text-sm font-medium">
                    {field.displayName}
                    {field.isRequired && <span className="text-destructive ml-1">*</span>}
                </label>
                {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
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
        if (mode === 'multi' && selectedIds?.length) {
            return renderMultiSelectView();
        }

        return (
            <div className="space-y-6">
                <div className="space-y-4">
                    {fieldInfo.map(field => renderField(field))}
                </div>
                {mode !== 'view' && (
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setMode('view')}>
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
        <ScrollArea className="h-full">
            <div className="p-6">
                {(selectedId || mode === 'create' || (selectedIds && selectedIds.length > 0)) ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl font-bold">
                                {mode === 'create'
                                 ? `New ${entityDisplayName}`
                                 : mode === 'multi'
                                   ? `${selectedIds?.length} Selected`
                                   : activeRecord ? getDisplayValue(activeRecord) : ''}
                            </h1>
                            {mode === 'view' && selectedId && (
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
                                                <AlertDialogAction onClick={handleDelete}>
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
    );
}
