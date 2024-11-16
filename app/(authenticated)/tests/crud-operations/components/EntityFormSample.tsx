// EntityForm.tsx
import * as React from 'react';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Button} from '@/components/ui/button';
import {EntityData, EntityKeys} from '@/types/entityTypes';
import {useQuickReference} from '@/lib/redux/entity/hooks/useQuickReference';
import {Save, X} from 'lucide-react';
import {toast} from '@/components/ui';
import {DeleteRecordAction, FormField, MultiRecordView} from './SimpleFormField';
import EntityLogger from "@/lib/redux/entity/entityLogger";

interface EntityFormProps<TEntity extends EntityKeys> {
    ref: React.Ref<any>;
    entityKey: TEntity;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    allowCreateNew?: boolean;
}

export interface EntityFormPanelRefs {
    handleCreateNew?: () => void;
}


type FormMode = 'view' | 'edit' | 'create' | 'multi';

export const EntityForm = React.forwardRef<EntityFormPanelRefs, EntityFormProps<EntityKeys>>((
        {
            entityKey,
            onCreateSuccess,
            onUpdateSuccess,
            onDeleteSuccess,
            allowCreateNew = true,
        }: EntityFormProps<EntityKeys>,
        ref
    ) => {
        const {
            entityDisplayName,
            fieldInfo,
            selectedRecords,
            selectedRecordIds,
            activeRecord,
            createRecord,
            updateRecord,
            deleteRecord,
            getRecordIdByRecord,
            getDisplayValue,
            selectionMode,
            clearSelection,
        } = useQuickReference(entityKey);
        const entityLogger = EntityLogger.createLoggerWithDefaults("ENTITY FORM PANEL", entityKey);

        const [formData, setFormData] = React.useState<Partial<EntityData<EntityKeys>>>({});
        const [viewMode, setViewMode] = React.useState<FormMode>('view');

        React.useImperativeHandle(ref, () => ({
            handleCreateNew: () => handleCreateNew(),
        }));

        React.useEffect(() => {
            if (selectionMode === 'multiple' && selectedRecordIds?.length) {
                setViewMode('multi');
            } else if (activeRecord && viewMode !== 'create') {
                setFormData(activeRecord);
                setViewMode('view');
            }
        }, [activeRecord, selectionMode, selectedRecordIds]);


        const handleCreateNew = () => {
            if (!allowCreateNew) return;
            clearSelection();
            const defaultValues = fieldInfo.reduce(
                (acc, field) => ({
                    ...acc,
                    [field.name]: field.defaultValue,
                }),
                {} as Partial<EntityData<EntityKeys>>
            );
            setFormData(defaultValues);
            setViewMode('create');
        };


        const handleSave = () => {
            const callback = (result: { success: boolean; error?: any }) => {
                if (result.success) {
                    toast({
                        title: viewMode === 'create' ? "Created" : "Updated",
                        description: `Record ${viewMode === 'create' ? 'created' : 'updated'} successfully`,
                        variant: "success",
                    });
                    setViewMode('view');
                    if (viewMode === 'create') {
                        onCreateSuccess?.();
                    } else {
                        onUpdateSuccess?.();
                    }
                } else {
                    toast({
                        title: 'Error',
                        description: result.error?.message || 'An error occurred',
                        variant: 'destructive',
                    });
                }
            };

            if (viewMode === 'create') {
                createRecord(formData, callback);
            } else if (viewMode === 'edit' && activeRecord) {
                const recordId = getRecordIdByRecord(activeRecord);
                if (!recordId) return;
                updateRecord(recordId, formData, callback);
            }
        };

        const handleDelete = () => {
            if (!activeRecord) return;
            const recordId = getRecordIdByRecord(activeRecord);
            if (!recordId) return;
            console.log('Deleting record:', recordId);


            deleteRecord(recordId, (result) => {
                if (result.success) {
                    toast({
                        title: 'Deleted',
                        description: 'Record deleted successfully',
                    });
                    onDeleteSuccess?.();
                } else {
                    toast({
                        title: 'Error',
                        description: result.error?.message || 'An error occurred',
                        variant: "destructive",
                    });
                }
            });
        };

        const renderField = (field: typeof fieldInfo[0], record?: EntityData<EntityKeys>) => {
            entityLogger.log('info', 'renderField');

            const isReadOnly = viewMode === 'view' || field.isPrimaryKey;
            entityLogger.log('info', 'View Mode', {viewMode});
            console.log('-- View mode: ', viewMode);

            entityLogger.log('info', 'Field is read only', {isReadOnly});

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
                viewMode,
                selectedRecordIds,
                selectedRecords
            });

            if (viewMode === 'multi' && selectedRecordIds && selectedRecordIds.length > 0) {
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
                    {viewMode !== 'view' && (
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setViewMode('view')}>
                                <X className="h-4 w-4 mr-1"/>
                                Cancel
                            </Button>
                            <Button onClick={handleSave}>
                                <Save className="h-4 w-4 mr-1"/>
                                {viewMode === 'create' ? 'Create' : 'Save'}
                            </Button>
                        </div>
                    )}
                </div>
            );
        };

        return (
            <>
                {allowCreateNew && (
                    <div className="flex justify-end p-6">
                        <Button
                            onClick={handleCreateNew}
                            size="sm"
                            variant="secondary"
                        >
                            Create New
                        </Button>
                    </div>
                )}

                <ScrollArea className="h-full">
                    <div className="p-6">
                        {(activeRecord || viewMode === 'create' || (selectedRecordIds && selectedRecordIds.length > 0)) ? (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h1 className="text-2xl font-bold">
                                        {viewMode === 'create'
                                         ? `New ${entityDisplayName}`
                                         : viewMode === 'multi'
                                           ? `${selectedRecordIds?.length} Selected`
                                           : activeRecord ? getDisplayValue(activeRecord) : ''}
                                    </h1>
                                    {viewMode === 'view' && activeRecord && (
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => setViewMode('edit')}
                                                size="sm"
                                            >
                                                Edit
                                            </Button>
                                            <DeleteRecordAction onDelete={handleDelete}/>
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
            </>
        );
    }
);
