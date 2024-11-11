import React, {useState, useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {GripVertical, X, Plus, Trash, Save, CheckSquare} from 'lucide-react';
import {useEntityQuickReference} from '@/lib/redux/entity/hooks/useEntityQuickReference';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Input} from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {Textarea} from "@/components/ui/textarea";
import {Switch} from "@/components/ui/switch";
import {Checkbox} from "@/components/ui/checkbox";
import {DatePicker} from "@/components/ui/date-picker";
import {toast} from "@/components/ui/use-toast";
import {EntityStateField} from "@/lib/redux/entity/types";
import {createRecordKey} from "@/lib/redux/entity/utils";

export const EntityQuickReferenceView = ({entityKey}) => {
    const [sidebarSize, setSidebarSize] = useState(20);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const {
        quickReferenceRecords,
        selectedQuickReference,
        activeRecord,
        handleMultipleSelections,
        handleSingleSelection,
        selectedQuickReferences,
        primaryKeyMetadata,
        clearSelection,
        entityDisplayName,
        fieldInfo,
        loading,
        error,
        createRecord,
        updateRecord,
        deleteRecord,
        isValidated,
        handleSetValidated,
        isMultiSelectMode,
        toggleMultiSelectMode,
    } = useEntityQuickReference(entityKey);

    // Form setup
    const form = useForm({
        defaultValues: activeRecord || {},
    });

    // Update form when active record changes
    useEffect(() => {
        if (activeRecord && !isCreating) {
            form.reset(activeRecord);
        }
    }, [activeRecord, form, isCreating]);

    // Filter quick references based on search term
    const filteredReferences = quickReferenceRecords.filter(ref =>
        ref.displayValue.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreateNew = () => {
        clearSelection();
        setIsCreating(true);
        form.reset({});
    };

    const handleCancel = () => {
        setIsCreating(false);
        if (activeRecord) {
            form.reset(activeRecord);
        }
    };

    const handleSubmit = (data) => {
        handleSetValidated(true);

        if (!isValidated) {
            toast({
                title: "Validation Error",
                description: "Please check all required fields",
                variant: "destructive",
            });
            return;
        }

        if (isCreating) {
            createRecord(data, {
                onSuccess: () => {
                    toast({
                        title: "Success",
                        description: "Record created successfully",
                    });
                    setIsCreating(false);
                },
                onError: (error) => {
                    toast({
                        title: "Error",
                        description: error.message,
                        variant: "destructive",
                    });
                },
            });
        } else {
            updateRecord(data, {
                onSuccess: () => {
                    toast({
                        title: "Success",
                        description: "Record updated successfully",
                    });
                },
                onError: (error) => {
                    toast({
                        title: "Error",
                        description: error.message,
                        variant: "destructive",
                    });
                },
            });
        }
    };

    const isSelected = (ref) => {
        const refKey = createRecordKey(primaryKeyMetadata, ref.primaryKeyValues);
        return selectedQuickReferences.some(selected =>
            createRecordKey(primaryKeyMetadata, selected.primaryKeyValues) === refKey
        );
    }

    const getCardClassName = (ref) => {
        const isItemSelected = isSelected(ref);
        const baseClasses = "cursor-pointer transition-colors hover:bg-accent/50";
        if (isMultiSelectMode) {
            return `${baseClasses} ${isItemSelected ? 'border-primary bg-accent' : 'border-transparent'}`;
        }
        return `${baseClasses} ${
            isItemSelected
            ? 'border-primary border-2 bg-accent'
            : 'border-transparent'
        }`;
    };

    // Simplified selection handler
    const handleSelection = (primaryKeyValues) => {
        if (isMultiSelectMode) {
            handleMultipleSelections(primaryKeyValues);
        } else {
            handleSingleSelection(primaryKeyValues);
            setIsCreating(false);
        }
    };

    // Update multi-select toggle to handle create mode
    const handleToggleMultiSelect = () => {
        if (isCreating) {
            setIsCreating(false);
        }
        toggleMultiSelectMode();
    };

    const renderFormContent = () => {
        if (isMultiSelectMode) {
            return (
                <Card>
                    <CardHeader>
                        <CardTitle>Selected Items</CardTitle>
                        <CardDescription>
                            {selectedQuickReferences.length} items selected
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {selectedQuickReferences.map(ref => (
                                <div key={JSON.stringify(ref.primaryKeyValues)}
                                     className="flex items-center justify-between p-2 border rounded">
                                    <span>{ref.displayValue}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSelection(ref.primaryKeyValues)}
                                    >
                                        <X className="h-4 w-4"/>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2">
                        <Button
                            variant="destructive"
                            onClick={() => clearSelection()}
                            disabled={selectedQuickReferences.length === 0}
                        >
                            Clear Selection
                        </Button>
                    </CardFooter>
                </Card>
            );
        }

        return (
            <Card>
                <CardHeader>
                    <CardTitle>
                        {isCreating ? 'Create New Record' : 'Record Details'}
                    </CardTitle>
                    <CardDescription>
                        {isCreating
                         ? 'Enter the details for the new record'
                         : 'View and edit record information'
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                            {fieldInfo.map(field => (
                                <div key={field.name}>
                                    {renderField(field)}
                                </div>
                            ))}
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
                    {isCreating && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                    )}
                    <Button
                        type="submit"
                        onClick={form.handleSubmit(handleSubmit)}
                        disabled={loading}
                    >
                        <Save className="h-4 w-4 mr-1"/>
                        {loading ? 'Saving...' : 'Save'}
                    </Button>
                </CardFooter>
            </Card>
        );
    };

    const renderField = (field: EntityStateField) => {
        const commonProps = {
            control: form.control,
            name: field.name,
            label: field.displayName,
            required: field.isRequired,
        };

        const getValueOrDefault = (value, defaultValue) => value ?? defaultValue;

        const defaultValue = field.defaultValue;

        switch (field.dataType) {
            case 'string':
                return field.maxLength > 255 ? (
                    <FormField
                        {...commonProps}
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>{commonProps.label}</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        value={getValueOrDefault(field.value, defaultValue)}
                                    />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                ) : (
                           <FormField
                               {...commonProps}
                               render={({field}) => (
                                   <FormItem>
                                       <FormLabel>{commonProps.label}</FormLabel>
                                       <FormControl>
                                           <Input
                                               {...field}
                                               value={getValueOrDefault(field.value, defaultValue)}
                                           />
                                       </FormControl>
                                       <FormMessage/>
                                   </FormItem>
                               )}
                           />
                       );
            case 'number':
                return (
                    <FormField
                        {...commonProps}
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>{commonProps.label}</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        {...field}
                                        value={getValueOrDefault(field.value, defaultValue)}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                    />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                );
            case 'boolean':
                return (
                    <FormField
                        {...commonProps}
                        render={({field}) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel>{commonProps.label}</FormLabel>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={getValueOrDefault(field.value, defaultValue)}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                );
            case 'date':
                return (
                    <FormField
                        {...commonProps}
                        render={({field}) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>{commonProps.label}</FormLabel>
                                <DatePicker
                                    value={getValueOrDefault(field.value, defaultValue)}
                                    onChange={field.onChange}
                                />
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <ResizablePanelGroup
            direction="horizontal"
            className="h-[calc(100vh-4rem)] overflow-hidden"
        >
            <ResizablePanel
                defaultSize={sidebarSize}
                minSize={15}
                maxSize={40}
                onResize={setSidebarSize}
                className="border-r"
            >
                <div className="h-full flex flex-col">
                    <div className="p-4 border-b">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">{entityDisplayName}</h2>
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleToggleMultiSelect}
                                    size="sm"
                                    variant={isMultiSelectMode ? "secondary" : "outline"}
                                    className="h-8"
                                >
                                    <CheckSquare className="h-4 w-4 mr-1"/>
                                    {isMultiSelectMode ? 'Cancel Multi-Select' : 'Multi-Select'}
                                </Button>
                                {!isMultiSelectMode && (
                                    <Button
                                        onClick={handleCreateNew}
                                        size="sm"
                                        className="h-8"
                                    >
                                        <Plus className="h-4 w-4 mr-1"/>
                                        New
                                    </Button>
                                )}
                            </div>
                        </div>
                        <Input
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <ScrollArea className="flex-grow">
                        <div className="p-2 space-y-2">
                            {filteredReferences.map(ref => (
                                <Card
                                    key={JSON.stringify(ref.primaryKeyValues)}
                                    className={getCardClassName(ref)}
                                    onClick={() => handleSelection(ref.primaryKeyValues)}
                                >
                                    <CardContent className="p-3">
                                        <div className="flex items-center gap-2">
                                            {isMultiSelectMode && (
                                                <Checkbox
                                                    checked={isSelected(ref)}
                                                    onCheckedChange={() => handleSelection(ref.primaryKeyValues)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            )}
                                            <div className="text-sm">{ref.displayValue}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </ResizablePanel>

            <ResizableHandle>
                <GripVertical className="h-4 w-4"/>
            </ResizableHandle>

            <ResizablePanel defaultSize={100 - sidebarSize}>
                <ScrollArea className="h-full">
                    <div className="p-6">
                        {(activeRecord || isCreating || (isMultiSelectMode && selectedQuickReferences.length > 0)) ? (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h1 className="text-2xl font-bold">
                                        {isCreating ? `New ${entityDisplayName}` :
                                         isMultiSelectMode ? `${selectedQuickReferences.length} Items Selected` :
                                         selectedQuickReference?.displayValue}
                                    </h1>
                                    {!isCreating && !isMultiSelectMode && selectedQuickReference && (
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
                                                        Are you sure you want to
                                                        delete {selectedQuickReference?.displayValue}?
                                                        This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => deleteRecord({
                                                            onSuccess: () => {
                                                                toast({
                                                                    title: "Success",
                                                                    description: "Record deleted successfully",
                                                                });
                                                            },
                                                            onError: (error) => {
                                                                toast({
                                                                    title: "Error",
                                                                    description: error.message,
                                                                    variant: "destructive",
                                                                });
                                                            }
                                                        })}
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                                {renderFormContent()}
                            </div>
                        ) : (
                             <div className="h-full flex items-center justify-center">
                                 <div className="text-center">
                                     <h2 className="text-xl font-semibold mb-2">No Record Selected</h2>
                                     <p className="text-muted-foreground">
                                         Select a record from the sidebar to view or edit its details
                                     </p>
                                 </div>
                             </div>
                         )}
                    </div>
                </ScrollArea>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
};

export default EntityQuickReferenceView;
