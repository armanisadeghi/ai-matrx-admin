import React from 'react';
import {Info, Trash} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface FieldTooltipProps {
    description: string;
}

export const FieldTooltip = ({description}: FieldTooltipProps) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger>
                <Info className="h-5 w-5 text-muted-foreground"/>
            </TooltipTrigger>
            <TooltipContent>
                <p>{description}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

interface DeleteAlertProps {
    onDelete: () => void;
}

export const DeleteAlert = ({onDelete}: DeleteAlertProps) => (
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
                <AlertDialogAction onClick={onDelete}>
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);

interface FormFieldProps {
    field: {
        name: string;
        displayName: string;
        description?: string;
        isRequired?: boolean;
        isPrimaryKey?: boolean;
        defaultValue?: string;
        maxLength?: number;
    };
    value: any;
    isReadOnly: boolean;
    onChange: (value: string) => void;
}

export const FormField = ({field, value, isReadOnly, onChange}: FormFieldProps) => (
    <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-2">
            <div className="w-1/4 flex items-center gap-2">
                <span className="text-md font-medium truncate">
                    {field.displayName}
                    {field.isRequired && <span className="text-destructive ml-1">*</span>}
                </span>
                {field.description && <FieldTooltip description={field.description}/>}
            </div>
            <div className="flex-1">
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={isReadOnly}
                    placeholder={field.defaultValue || ''}
                    maxLength={field.maxLength}
                    className="w-full"
                />
            </div>
        </div>
    </div>
);

interface MultiRecordViewProps<T extends Record<string, any>> {
    records: T[];
    fields: Array<{
        name: string;
        displayName: string;
        isPrimaryKey?: boolean;
    }>;
    getRecordId: (record: T) => string | null;
    getDisplayValue: (record: T) => string;
}

export function MultiRecordView<T extends Record<string, any>>(
    {
        records,
        fields,
        getRecordId,
        getDisplayValue
    }: MultiRecordViewProps<T>) {
    console.log('MultiRecordView rendered with:', {
        recordCount: records.length,
        fields,
    });

    return (
        <Accordion type="single" collapsible className="w-full">
            {records.map(record => {
                const recordId = getRecordId(record);
                if (!recordId) {
                    console.log('No record ID for record:', record);
                    return null;
                }

                return (
                    <AccordionItem key={recordId} value={recordId}>
                        <AccordionTrigger className="px-4">
                            {getDisplayValue(record)}
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-4 p-4">
                                {fields.map(field => {
                                    if (field.isPrimaryKey) return null;
                                    return (
                                        <div key={field.name} className="space-y-1">
                                            <label className="text-sm font-medium">
                                                {field.displayName}
                                            </label>
                                            <div className="text-sm">
                                                {record[field.name] || '-'}
                                            </div>
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
}
