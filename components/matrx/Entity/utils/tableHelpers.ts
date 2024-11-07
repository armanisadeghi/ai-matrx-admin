// app/(authenticated)/tests/matrx-table/components/StandardTabUtil.ts

import { FormField, FormFieldType, FormState, TabData } from "@/types/AnimatedFormTypes";
import {TableData} from "@/types/tableTypes";
import {v4 as uuidv4} from "uuid";
import { cn } from "@/lib/utils";

export const formatValue = {
    number: (value: number, format?: string, precision: number = 2) => {
        switch (format) {
            case "decimal":
                return value.toFixed(precision);
            case "percent":
                return `${(value * 100).toFixed(precision)}%`;
            case "compact":
                return Intl.NumberFormat('en', { notation: 'compact' }).format(value);
            default:
                return value.toString();
        }
    },

    currency: (value: number, currency = 'USD', locale = 'en-US') => {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency
        }).format(value);
    }
};

export const getProgressColor = (value: number, useColorScale: boolean) => {
    if (!useColorScale) return "bg-blue-500";

    return cn(
        "h-full rounded-full",
        value > 66 ? "bg-green-500" :
        value > 33 ? "bg-yellow-500" :
        "bg-red-500"
    );
};


export const truncateText = (text: unknown, maxLength: number = 100): string => {
    if (typeof text !== 'string') {
        return String(text);
    }
    if (maxLength === 0 || text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
};

export const toTitleCase = (str: string) => {
    return str
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
};


export type DataWithOptionalId = { id?: string; [key: string]: any };
export type DataWithId = { id: string; [key: string]: any };

export function ensureId<T extends DataWithOptionalId | DataWithOptionalId[]>(input: T):
    T extends DataWithOptionalId[] ? DataWithId[] : DataWithId {
    if (Array.isArray(input)) {
        return input.map((item) => ({
            ...item,
            id: item.id ?? uuidv4(),
        })) as unknown as T extends DataWithOptionalId[] ? DataWithId[] : DataWithId;
    } else {
        if ('id' in input && typeof input.id === 'string') {
            return input as unknown as T extends DataWithOptionalId[] ? DataWithId[] : DataWithId;
        }
        return {...input, id: uuidv4()} as unknown as T extends DataWithOptionalId[] ? DataWithId[] : DataWithId;
    }
}

// TODO: Integrate this with many other old-tools like it in a centralized place. (Great for demos and adds 'intelligence' to the app)

export const generateFormFields = (rowData: TableData): FormField[] => {
    return Object.entries(rowData).map(([key, value]): FormField => {
        let type: FormFieldType = 'text';
        if (typeof value === 'number') type = 'number';
        if (typeof value === 'boolean') type = 'checkbox';
        if (typeof value === 'string' && value.length > 100) type = 'textarea';
        if (key.toLowerCase().includes('email')) type = 'email';
        if (key.toLowerCase().includes('password')) type = 'password';
        if (key.toLowerCase().includes('date')) type = 'date';
        if (key.toLowerCase().includes('time')) type = 'time';
        if (key.toLowerCase().includes('color')) type = 'color';
        if (key.toLowerCase().includes('url')) type = 'url';
        if (key.toLowerCase().includes('tel')) type = 'tel';

        return {
            name: key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            type,
            required: false,
            disabled: false,
        };
    });
};

// New function to generate the standard tab data
export const generateStandardTabData = (
    selectedRow: TableData | null,
    setActiveTab: (tab: string) => void,
    setIsModalOpen: (open: boolean) => void,
    formState: FormState,
    onAction: ((action: string, rowData: TableData) => void) | undefined
): TabData[] => {
    const formStateWithUUIDs = ensureId(formState);



    if (!selectedRow) return [];
    return [
        {
            value: "view",
            label: "View",
            fields: generateFormFields(selectedRow).map(field => ({...field, disabled: true})),
            buttons: [
                {label: 'Edit', onClick: () => setActiveTab('edit'), className: 'bg-primary text-primary-foreground'},
            ]
        },
        {
            value: "edit",
            label: "Edit",
            fields: generateFormFields(selectedRow),
            buttons: [
                {
                    label: 'Cancel',
                    onClick: () => setActiveTab('view'),
                    className: 'bg-secondary text-secondary-foreground'
                },
                {
                    label: 'Save', onClick: () => {
                        if (onAction) onAction('save', formStateWithUUIDs);
                        setIsModalOpen(false);
                    }, className: 'bg-primary text-primary-foreground'
                },
            ]
        },
        {
            value: "delete",
            label: "Delete",
            fields: generateFormFields(selectedRow).map(field => ({...field, disabled: true})),
            buttons: [
                {
                    label: 'Confirm Delete', onClick: () => {
                        if (onAction) onAction('delete', selectedRow);
                        setIsModalOpen(false);
                    }, className: 'bg-destructive text-destructive-foreground'
                },
            ]
        }
    ];
};

