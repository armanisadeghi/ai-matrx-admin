import React from 'react';
import { Button } from '@/components/ui';
import { Trash, Plus } from 'lucide-react';
import { formatLabel } from "@/components/socket-io/utils/label-util";
import { SchemaField } from "@/constants/socket-constants";
import FormField, { FieldOverrides } from '@/components/socket-io/form-builder/FormField';

interface ArrayFieldSectionProps {
    taskId: string;
    fieldName: string;
    fieldDefinition: SchemaField;
    path: string;
    value: any[];
    errors: { [key: string]: boolean };
    notices: { [key: string]: string };
    formData: any;
    onChange: (key: string, value: any) => void;
    onBlur: (key: string, field: SchemaField, value: any) => void;
    onDeleteArrayItem?: (key: string, index: number) => void;
    fieldOverrides?: FieldOverrides;
    testMode?: boolean;
}

const ArrayFieldSection: React.FC<ArrayFieldSectionProps> = ({
    taskId,
    fieldName,
    fieldDefinition,
    path,
    value,
    errors,
    notices,
    formData,
    onChange,
    onBlur,
    onDeleteArrayItem,
    fieldOverrides = {},
    testMode = false,
}) => {
    return (
        <div className="w-full">
            <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-1 text-slate-700 dark:text-slate-300 font-medium">{formatLabel(fieldName)}</div>
                <div className="col-span-11">
                    <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
                        {value.map((item: any, index: number) => {
                            // Construct the indexed path for this array item, e.g., broker_values[0]
                            const indexedPath = `${path}[${index}]`;

                            return (
                                <div key={indexedPath} className="relative">
                                    {Object.entries(fieldDefinition.REFERENCE).map(([nestedKey, nestedField]) => {
                                        // Construct the full path for the nested field, e.g., broker_values[0].name
                                        const nestedPath = `${indexedPath}.${nestedKey}`;

                                        return (
                                            <FormField
                                                key={nestedPath}
                                                taskId={taskId}
                                                fieldName={nestedKey}
                                                fieldDefinition={nestedField as SchemaField}
                                                path={indexedPath} // Pass the indexed path (e.g., broker_values[0])
                                                value={item?.[nestedKey] ?? (nestedField as SchemaField).DEFAULT}
                                                errors={errors}
                                                notices={notices}
                                                formData={formData}
                                                onChange={onChange}
                                                onBlur={onBlur}
                                                onDeleteArrayItem={onDeleteArrayItem}
                                                fieldOverrides={fieldOverrides}
                                                testMode={testMode}
                                            />
                                        );
                                    })}
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="absolute right-0 top-0 mt-2 mr-2"
                                        onClick={() => {
                                            if (onDeleteArrayItem) {
                                                onDeleteArrayItem(path, index); // Pass the base path and index
                                            }
                                        }}
                                    >
                                        <Trash className="w-5 h-5 p-0" />
                                    </Button>
                                    {index < value.length - 1 && <hr className="my-4 border-slate-300 dark:border-slate-600" />}
                                </div>
                            );
                        })}
                        <Button
                            onClick={() => {
                                const defaultItem = {};
                                if (fieldDefinition.REFERENCE) {
                                    Object.entries(fieldDefinition.REFERENCE).forEach(([key, fieldDef]) => {
                                        const typedFieldDef = fieldDef as SchemaField;
                                        defaultItem[key] = typedFieldDef.DEFAULT;
                                    });
                                }
                                const newArray = [...value, defaultItem];
                                onChange(path, newArray); // Update the array with the new item
                            }}
                            variant="outline"
                            className="border-gray-500 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                        >
                            <Plus className="w-5 h-5 mr-1" />
                            {formatLabel(fieldName)} Entry
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArrayFieldSection;