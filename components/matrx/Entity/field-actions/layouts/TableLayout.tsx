// components/record-display/layouts/TableLayout.tsx
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {EntityStateFieldWithValue} from '@/lib/redux/entity/types';

import {FieldAction} from '../components/FieldAction';
import {RecordDisplayConfig} from "@/components/matrx/Entity/field-actions/types";
import {FormattedFieldValue} from '../components/FormattedFieldValue';

interface TableLayoutProps {
    fields: EntityStateFieldWithValue[];
    config: RecordDisplayConfig;
    onChange?: (fieldName: string, value: any) => void;
}

export const TableLayout: React.FC<TableLayoutProps> = (
    {
        fields,
        config,
        onChange
    }) => {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {fields.map(field => (
                    <TableRow key={field.name}>
                        <TableCell className="font-medium">{field.displayName}</TableCell>
                        <TableCell>
                            <FormattedFieldValue
                                value={field.value}
                                type={field.dataType}
                                label={field.displayName}
                                required={field.isRequired}
                                componentProps={field.componentProps}
                            />
                        </TableCell>
                        <TableCell>
                            {config.actions?.[field.name] && (
                                <div className="flex gap-2">
                                    {Object.entries(config.actions[field.name]).map(([key, action]) => (
                                        <FieldAction
                                            key={key}
                                            action={action}
                                            field={field}
                                            value={field.value}
                                            onChange={(value) => onChange?.(field.name, value)}
                                        />
                                    ))}
                                </div>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

