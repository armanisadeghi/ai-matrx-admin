// components/record-display/FormattedFieldValue.tsx
import React from 'react';
import {Badge} from '@/components/ui/badge';
import {formatDistanceToNow, format} from 'date-fns';
import {cn} from '@/lib/utils';
import {ComponentProps} from '@/lib/redux/entity/types';
import { FieldDataOptionsType } from '@/types/AutomationSchemaTypes';

interface FormattedFieldValueProps {
    value: any;
    type: FieldDataOptionsType;
    componentProps: ComponentProps;
    className?: string;
}

// Status colors with proper TypeScript type checking
const STATUS_COLORS = {
    active: 'bg-success/20 text-success-foreground',
    inactive: 'bg-muted/20 text-muted-foreground',
    pending: 'bg-warning/20 text-warning-foreground',
    error: 'bg-destructive/20 text-destructive-foreground',
} as const;

type StatusColorKey = keyof typeof STATUS_COLORS;

export const FormattedFieldValue: React.FC<FormattedFieldValueProps> = (
    {
        value,
        type,
        componentProps,
        className
    }) => {
    // Early return for null/undefined values
    if (value === null || value === undefined) {
        return <span className="text-muted-foreground italic">Not set</span>;
    }

    // Helper function for date validation
    const isValidDate = (dateString: string): boolean => {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime());
    };

    // Helper function for safe JSON parsing
    const parseJSON = (jsonString: string) => {
        try {
            return {
                data: JSON.parse(jsonString),
                error: null
            };
        } catch (error) {
            return {
                data: null,
                error: error instanceof Error ? error.message : 'Invalid JSON'
            };
        }
    };

    switch (type) {
        case 'datetime':
            if (!isValidDate(value)) {
                return <span className="text-destructive">Invalid date</span>;
            }
            return (
                <div className="space-y-1">
                    <div>{format(new Date(value), 'PPP')}</div>
                    <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(value), {addSuffix: true})}
                    </div>
                </div>
            );

        case 'boolean':
            return (
                <Badge variant={value ? 'default' : 'secondary'}>
                    {value ? 'Yes' : 'No'}
                </Badge>
            );

        case 'enum':
            const statusColor = STATUS_COLORS[value as StatusColorKey] || 'bg-secondary';
            return (
                <Badge className={cn(statusColor, className)}>
                    {value}
                </Badge>
            );

        case 'array':
            if (!Array.isArray(value)) {
                return <span className="text-destructive">Invalid array</span>;
            }
            return (
                <div className="space-y-1">
                    {value.length === 0 ? (
                        <span className="text-muted-foreground italic">Empty array</span>
                    ) : (
                         value.map((item, index) => (
                             <div key={index} className="flex items-center gap-2">
                                 <Badge variant="outline">
                                     {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                                 </Badge>
                             </div>
                         ))
                     )}
                </div>
            );

        case 'json':
            const {data: jsonData, error: jsonError} = typeof value === 'string'
                                                       ? parseJSON(value)
                                                       : {data: value, error: null};

            if (jsonError) {
                return <span className="text-destructive">{jsonError}</span>;
            }

            return (
                <pre className="text-sm bg-muted p-2 rounded-md overflow-x-auto max-h-[300px]">
          {JSON.stringify(jsonData, null, 2)}
        </pre>
            );

        case 'url':
            const isValidUrl = (urlString: string) => {
                try {
                    new URL(urlString);
                    return true;
                } catch {
                    return false;
                }
            };

            return isValidUrl(value) ? (
                <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                >
                    {value}
                </a>
            ) : (
                       <span className="text-destructive">Invalid URL</span>
                   );

        case 'number':
            const numberValue = Number(value);
            if (isNaN(numberValue)) {
                return <span className="text-destructive">Invalid number</span>;
            }

            return (
                <span className="font-mono">
          {numberValue.toLocaleString(
              undefined,
              componentProps?.numberFormat as Intl.NumberFormatOptions
          )}
        </span>
            );

        default:
            return (
                <span className={cn("text-foreground", className)}>
          {String(value)}
        </span>
            );
    }
};
