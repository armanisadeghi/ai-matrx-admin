'use client';
import React from 'react';
import {
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Switch} from '@/components/ui/switch';
import {Button} from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Badge} from '@/components/ui/badge';
import {Copy, Plus} from "lucide-react";
import {EnhancedJsonViewer, FullJsonViewer} from '@/components/ui';

interface FieldWrapperProps {
    label: string;
    children: React.ReactNode;
    error?: string;
}

interface CommonProps {
    control: any;
    name: string;
    label: string;
    required: boolean;
    isDisplayField: boolean;
    isPrimaryKey: boolean;
    dataType: string;
    isArray: boolean;
    structure: any;
    isNative: boolean;
    defaultComponent: string;
    componentProps?: any;
    maxLength?: number;
    defaultValue?: any;
    defaultGeneratorFunction?: any;
    validationFunctions?: any[];
    exclusionRules?: any[];
    enumValues?: any[];
    databaseTable?: string;
}

interface FieldProps {
    field: any;
    formField: any;
    commonProps: CommonProps;
    disabled?: boolean; // New prop
}

export const UUIDField: React.FC<FieldProps> = ({field, formField, disabled}) => {
    const handleUUIDCopy = () => {
        console.log('UUID field data:', field);
    };

    return (
        <FormItem>
            <FormLabel>{field.displayName}</FormLabel>
            <div className="flex gap-2">
                <FormControl>
                    <Input
                        {...formField}
                        value={formField.value ?? field.defaultValue}
                        className="font-mono"
                        readOnly={disabled}
                    />
                </FormControl>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleUUIDCopy}
                    disabled={disabled}
                >
                    <Copy className="h-4 w-4"/>
                </Button>
            </div>
            <FormMessage/>
        </FormItem>
    );
};

export const TextField: React.FC<FieldProps> = ({field, formField, disabled}) => {
    const maxLength = field.componentProps?.maxLength;

    return (
        <FormItem>
            <FormLabel>{field.displayName}</FormLabel>
            <FormControl>
                <Input
                    {...formField}
                    value={formField.value ?? field.defaultValue}
                    maxLength={maxLength}
                    readOnly={disabled}
                />
            </FormControl>
            <FormMessage/>
        </FormItem>
    );
};

export const TextareaField: React.FC<FieldProps> = ({field, formField, disabled}) => {
    const rows = field.componentProps?.rows || 3;

    return (
        <FormItem>
            <FormLabel>{field.displayName}</FormLabel>
            <FormControl>
                <Textarea
                    {...formField}
                    value={formField.value ?? field.defaultValue}
                    rows={rows}
                    readOnly={disabled}
                />
            </FormControl>
            <FormMessage/>
        </FormItem>
    );
};

export const SwitchField: React.FC<FieldProps> = ({field, formField, disabled}) => {
    return (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
                <FormLabel>{field.displayName}</FormLabel>
            </div>
            <FormControl>
                <Switch
                    checked={formField.value ?? field.defaultValue}
                    onCheckedChange={!disabled ? formField.onChange : undefined}
                    disabled={disabled}
                />
            </FormControl>
        </FormItem>
    );
};

export const JSONField: React.FC<FieldProps> = ({field, formField, disabled}) => {
    const isArray = field.defaultComponent === 'json-array';
    const maxHeight = field.componentProps?.maxHeight || "200px";

    return (
        <FormItem>
            <FormLabel>{field.displayName}</FormLabel>
            <FormControl>
                <div className="w-full">
                    <EnhancedJsonViewer
                        data={formField.value ?? (isArray ? [] : {})}
                        title={field.name}
                        allowMinimize={!disabled}
                        maxHeight={maxHeight}
                        className="w-full"
                    />
                </div>
            </FormControl>
            <FormMessage/>
        </FormItem>
    );
};

export const NumberField: React.FC<FieldProps> = ({field, formField, disabled}) => {
    const params = field.defaultComponent?.split(':')[1];
    const numberProps = {
        type: "number",
        step: params === 'float' ? '0.01' : '1',
        min: params === 'smallint' ? -32768 : undefined,
        max: params === 'smallint' ? 32767 : undefined,
    };

    return (
        <FormItem>
            <FormLabel>{field.displayName}</FormLabel>
            <FormControl>
                <Input
                    {...formField}
                    {...numberProps}
                    value={formField.value ?? field.defaultValue}
                    onChange={!disabled ? (e) => formField.onChange(Number(e.target.value)) : undefined}
                    readOnly={disabled}
                />
            </FormControl>
            <FormMessage/>
        </FormItem>
    );
};

export const SelectField: React.FC<FieldProps> = ({field, formField, disabled}) => {
    const isEnum = field.enumValues && field.enumValues.length > 0;

    if (isEnum) {
        return (
            <FormItem>
                <FormLabel>{field.displayName}</FormLabel>
                <Select
                    onValueChange={!disabled ? formField.onChange : undefined}
                    defaultValue={formField.value ?? field.defaultValue}
                    disabled={disabled}
                >
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an option"/>
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {field.enumValues.map((enumValue) => (
                            <SelectItem
                                key={enumValue}
                                value={enumValue}
                                disabled={disabled}
                            >
                                {enumValue.split('_')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ')}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <FormDescription>
                    {field.structure === 'foreignKey'
                     ? `References ${field.databaseTable}`
                     : `Choose from ${field.enumValues.length} options`}
                </FormDescription>
                <FormMessage/>
            </FormItem>
        );
    }

    return (
        <FormItem>
            <FormLabel>{field.displayName}</FormLabel>
            <FormControl>
                <div className="flex gap-2 items-center">
                    <Input
                        {...formField}
                        value={formField.value ?? field.defaultValue}
                        readOnly
                    />
                    <Badge variant="outline">{field.structure || 'Select'}</Badge>
                </div>
            </FormControl>
            <FormDescription className="text-muted-foreground">
                {field.structure === 'foreignKey'
                 ? `References ${field.databaseTable}`
                 : 'Select options will be loaded dynamically'}
            </FormDescription>
            <FormMessage/>
        </FormItem>
    );
};
