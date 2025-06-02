import React from 'react';
import { formatLabel } from "@/components/socket-io/utils/label-util";
import { SchemaField } from "@/constants/socket-schema";
import FormField, { FieldOverrides } from '@/components/socket-io/form-builder/FormField';

interface RelatedObjectSectionProps {
    taskId: string;
    fieldName: string;
    fieldDefinition: SchemaField;
    path: string;
    value: any;
    errors: { [key: string]: boolean };
    notices: { [key: string]: string };
    formData: any;
    onChange: (key: string, value: any) => void;
    onBlur: (key: string, field: SchemaField, value: any) => void;
    onDeleteArrayItem?: (key: string, index: number) => void;
    fieldOverrides?: FieldOverrides;
    testMode?: boolean;
}

const RelatedObjectSection: React.FC<RelatedObjectSectionProps> = ({
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
        <div className="w-full mb-4">
            <div className="grid grid-cols-12 gap-4 mb-2">
                <div className="col-span-1 text-slate-700 dark:text-slate-300 text-xs font-medium">{formatLabel(fieldName)}</div>
                <div className="col-span-11">
                    <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
                        {Object.entries(fieldDefinition.REFERENCE).map(([nestedKey, nestedField]) => (
                            <FormField
                                key={`${path}.${nestedKey}`}
                                taskId={taskId}
                                fieldName={nestedKey}
                                fieldDefinition={nestedField as SchemaField}
                                path={path}
                                value={value?.[nestedKey] ?? (nestedField as SchemaField).DEFAULT}
                                errors={errors}
                                notices={notices}
                                formData={formData}
                                onChange={onChange}
                                onBlur={onBlur}
                                onDeleteArrayItem={onDeleteArrayItem}
                                fieldOverrides={fieldOverrides}
                                testMode={testMode}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RelatedObjectSection;