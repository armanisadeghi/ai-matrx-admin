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
// Type definitions
interface FieldWrapperProps {
    label: string;
    children: React.ReactNode;
    error?: string;
}

interface CommonProps {
    control: any;
    name: string;
    label: string;
    required?: boolean;
    isDisplayField?: boolean;
    isPrimaryKey?: boolean;
    dataType: string;
    isArray?: boolean;
    structure?: any;
    isNative?: boolean;
    defaultComponent?: string;
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
}


export const UUIDField: React.FC<FieldProps> = ({field, formField}) => {
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
                    />
                </FormControl>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleUUIDCopy}
                >
                    <Copy className="h-4 w-4"/>
                </Button>
            </div>
            <FormMessage/>
        </FormItem>
    );
};

// Text Input Field Component
export const TextField: React.FC<FieldProps> = ({field, formField}) => {
    const maxLength = field.componentProps?.maxLength;

    return (
        <FormItem>
            <FormLabel>{field.displayName}</FormLabel>
            <FormControl>
                <Input
                    {...formField}
                    value={formField.value ?? field.defaultValue}
                    maxLength={maxLength}
                />
            </FormControl>
            <FormMessage/>
        </FormItem>
    );
};

// Textarea Field Component
export const TextareaField: React.FC<FieldProps> = ({field, formField}) => {
    const rows = field.componentProps?.rows || 3;

    return (
        <FormItem>
            <FormLabel>{field.displayName}</FormLabel>
            <FormControl>
                <Textarea
                    {...formField}
                    value={formField.value ?? field.defaultValue}
                    rows={rows}
                />
            </FormControl>
            <FormMessage/>
        </FormItem>
    );
};

// Switch Field Component
export const SwitchField: React.FC<FieldProps> = ({field, formField}) => {
    return (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
                <FormLabel>{field.displayName}</FormLabel>
            </div>
            <FormControl>
                <Switch
                    checked={formField.value ?? field.defaultValue}
                    onCheckedChange={formField.onChange}
                />
            </FormControl>
        </FormItem>
    );
};

// JSON Editor Field Component
export const JSONField: React.FC<FieldProps> = ({field, formField}) => {
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
                        allowMinimize={true}
                        maxHeight={maxHeight}
                        className="w-full"
                    />
                </div>
            </FormControl>
            <FormMessage/>
        </FormItem>
    );
};

// Number Field Component
export const NumberField: React.FC<FieldProps> = ({field, formField}) => {
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
                    onChange={(e) => formField.onChange(Number(e.target.value))}
                />
            </FormControl>
            <FormMessage/>
        </FormItem>
    );
};

// Select Field Component
export const SelectField: React.FC<FieldProps> = ({field, formField}) => {
    const isEnum = field.enumValues && field.enumValues.length > 0;

    if (isEnum) {
        return (
            <FormItem>
                <FormLabel>{field.displayName}</FormLabel>
                <Select
                    onValueChange={formField.onChange}
                    defaultValue={formField.value ?? field.defaultValue}
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

