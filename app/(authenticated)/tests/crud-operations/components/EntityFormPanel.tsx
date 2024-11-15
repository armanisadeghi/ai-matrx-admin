// EntityFormPanel.tsx
import * as React from 'react';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Button} from '@/components/ui/button';
import {EntityData, EntityKeys} from '@/types/entityTypes';
import {useQuickReference} from '@/lib/redux/entity/hooks/useQuickReference';
import {Save, X} from 'lucide-react';
import {toast} from '@/components/ui';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {DeleteAlert, FormField, MultiRecordView } from './FormFieldComponents';

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

    React.useEffect(() => {
        if (selectionMode === 'multiple' && selectedIds?.length) {
            setMode('multi');
        } else if (activeRecord && mode !== 'create') {
            setFormData(activeRecord);
            setMode('view');
        }
    }, [activeRecord, selectionMode, selectedIds, mode]);

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
        console.log('Deleting record:', selectedId);
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
        const isReadOnly = mode === 'view' || field.isPrimaryKey;
        const value = record ? record[field.name] : formData[field.name] ?? '';

        return (
            <FormField
                key={field.name}
                field={field}
                value={value}
                isReadOnly={isReadOnly}
                onChange={(newValue) => {
                    if (!isReadOnly) {
                        setFormData(prev => ({
                            ...prev,
                            [field.name]: newValue
                        }));
                    }
                }}
            />
        );
    };

    const renderFormContent = () => {
        console.log('Rendering form content', {
            mode,
            selectedIds,
            selectedRecords
        });

        if (mode === 'multi' && selectedIds && selectedIds.length > 0) {
            return (
                <MultiRecordView
                    records={selectedRecords}
                    fields={fieldInfo}
                    getRecordId={getRecordIdByRecord}
                    getDisplayValue={getDisplayValue}
                />
            );
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
                                    <DeleteAlert onDelete={handleDelete} />
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
