import React, { useEffect } from 'react';
import { FullEditableJsonViewer } from './JsonEditor';
import { generateJsonTemplate } from "@/utils/schema/schemaUtils";

interface SchemaBasedJsonEditorProps extends React.HTMLAttributes<HTMLDivElement> {
    tableName: string;
    data: object;
    allowKeyEditing?: boolean;
    onChange: (newData: object) => void;
    onFormat?: () => void;
    initialExpanded?: boolean;
    maxHeight?: string;
    validateDelay?: number;
    lockKeys?: boolean;
}

export const SchemaBasedJsonEditor: React.FC<SchemaBasedJsonEditorProps> = (
    {
        tableName,
        data,
        allowKeyEditing = false,
        onChange,
        onFormat,
        initialExpanded,
        maxHeight,
        validateDelay,
        lockKeys,
        ...props
    }) => {

    useEffect(() => {
        // Generate the initial schema template when the tableName changes
        const template = generateJsonTemplate(tableName);
        const mergedData = { ...template, ...data };

        // Propagate the initial data to the parent component
        if (onChange) {
            onChange(mergedData);
        }
    }, [tableName]);

    const handleChange = (newData: object | string) => {
        const newDataObject = typeof newData === 'string' ? JSON.parse(newData) : newData;
        if (onChange) {
            onChange(newDataObject);
        }
    };

    return (
        <FullEditableJsonViewer
            data={data} // Use the controlled data from the parent
            onChange={handleChange}
            onFormat={onFormat}
            initialExpanded={initialExpanded}
            maxHeight={maxHeight}
            validateDelay={validateDelay}
            lockKeys={lockKeys !== undefined ? lockKeys : !allowKeyEditing}
            {...props}
        />
    );
};

export default SchemaBasedJsonEditor;
