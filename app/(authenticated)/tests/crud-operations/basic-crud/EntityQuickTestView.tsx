import * as React from 'react';
import {useQuickReference} from '@/lib/redux/entity/hooks/useQuickReference';
import {EntityData, EntityKeys} from '@/types/entityTypes';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
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
import {toast} from '@/components/ui/use-toast';
import {Plus, CheckSquare, Trash} from 'lucide-react';
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

interface EntityTestViewProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
}

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
        activeRecord,
        selectionMode,
        // Selection Utilities
        isSelected,
        handleSelection,
        handleMultiSelection,
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
    const [isEditing, setIsEditing] = React.useState(false);

    React.useEffect(() => {
        if (activeRecord) {
            setFormData(activeRecord);
        } else {
            setFormData({});
        }
    }, [activeRecord]);

    const handleCreateNew = () => {
        clearSelection();
        const defaultValues = fieldInfo.reduce((acc, field) => ({
            ...acc,
            [field.name]: field.defaultValue
        }), {});
        setFormData(defaultValues);
        setIsEditing(true);
    };

    // Basic card className helper for UI feedback
    const getCardClassName = (recordKey: string) => {
        const baseClasses = "cursor-pointer transition-colors hover:bg-accent/50";
        const isMultiple = selectionMode === 'multiple';
        return `${baseClasses} ${
            isSelected(recordKey)
            ? `border-primary ${isMultiple ? 'bg-accent' : 'border-2 bg-accent'}`
            : 'border-transparent'
        }`;
    };

    // Basic form for testing update operations
    const renderActiveRecordForm = () => {
        console.log('Active Record:', activeRecord);
        console.log('Field Info:', fieldInfo);

        if (!activeRecord) {
            console.log('No active record');
            return null;
        }

        const renderMultiSelectView = () => {
            return (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">
                        {selectedRecordIds.length} Items Selected
                    </h2>
                    {selectedRecords.map(record => (
                        <Card key={getRecordIdByRecord(record)}>
                            <CardHeader>
                                <CardTitle>{getDisplayValue(record)}</CardTitle>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            );
        };

        {selectionMode === 'multiple' ? renderMultiSelectView() : renderActiveRecordForm()}

        return (
            <div className="space-y-4">
                {fieldInfo.map(field => {
                    console.log('Rendering field:', field.name, 'Value:', activeRecord[field.name]);

                    if (field.isPrimaryKey) return null;

                    // Get the current value from the active record
                    const currentValue = activeRecord[field.name];

                    return (
                        <div key={field.name} className="space-y-2">
                            <label className="text-sm font-medium">
                                <span>{field.displayName}</span>
                                {field.isRequired && (
                                    <span className="text-destructive ml-1">*</span>
                                )}
                                {field.description && (
                                    <p className="text-xs text-muted-foreground">
                                        {field.description}
                                    </p>
                                )}
                            </label>
                            <Input
                                value={formData[field.name] || ''}
                                onChange={(e) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        [field.name]: e.target.value
                                    }));
                                }}
                            />
                            <Button
                                onClick={() => {
                                    if (!activeRecord) return;
                                    const recordId = getRecordIdByRecord(activeRecord);
                                    if (!recordId) return;

                                    updateRecord(recordId, formData, {
                                        onSuccess: () => {
                                            toast({ title: "Saved", description: "Changes saved successfully" });
                                            setIsEditing(false);
                                        }
                                    });
                                }}
                            >
                                Save Changes
                            </Button>


                        </div>

                    );
                })}
            </div>
        );
    };

    return (
        <div className="h-[calc(100vh-4rem)]">
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel
                    defaultSize={sidebarSize}
                    minSize={20}
                    maxSize={40}
                    onResize={setSidebarSize}
                >
                    <div className="h-full flex flex-col border-r">
                        <div className="p-4 border-b">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">
                                    {entityDisplayName}
                                </h2>
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
                                        onClick={() => {
                                            const newRecordData = {
                                                [fieldInfo.find(f => f.isDisplayField)?.name || '']: "New Record"
                                            } as Partial<EntityData<TEntity>>;

                                            createRecord(
                                                newRecordData,
                                                {
                                                    onSuccess: () => {
                                                        toast({
                                                            title: "Created",
                                                            description: "New record created",
                                                        });
                                                    },
                                                }
                                            );
                                        }}
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
                                                handleMultiSelection(ref.recordKey);
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
                            {activeRecord ? (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h1 className="text-2xl font-bold">
                                            {selectionMode === 'multiple'
                                             ? `${selectedRecordIds.length} Selected`
                                             : getDisplayValue(activeRecord)}
                                        </h1>
                                        {selectionMode !== 'multiple' && (
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
                                                    <AlertDialogAction
                                                        onClick={() => {
                                                            if (!activeRecord) return;

                                                            const recordId = getRecordIdByRecord(activeRecord);
                                                            if (!recordId) return;

                                                            deleteRecord(
                                                                recordId,
                                                                {
                                                                    onSuccess: () => {
                                                                        toast({
                                                                            title: "Deleted",
                                                                            description: "Record deleted successfully",
                                                                        });
                                                                    },
                                                                }
                                                            );
                                                        }}
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                    {renderActiveRecordForm()}
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
