import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { EnhancedJsonViewer } from '@/components/ui';

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

const getValueOrDefault = (value: any, defaultValue: any) => value ?? defaultValue;

// Base wrapper component for consistent layout
const FieldWrapper: React.FC<FieldWrapperProps> = ({ label, children, error }) => (
    <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>{children}</FormControl>
        {error && <FormMessage>{error}</FormMessage>}
    </FormItem>
);

// Individual field components
const StringField: React.FC<FieldProps> = ({ field, formField, commonProps }) => (
    <FieldWrapper label={commonProps.label}>
        {field.maxLength > 255 ? (
            <Textarea
                {...formField}
                value={getValueOrDefault(formField.value, field.defaultValue)}
            />
        ) : (
             <Input
                 {...formField}
                 value={getValueOrDefault(formField.value, field.defaultValue)}
             />
         )}
    </FieldWrapper>
);

const UUIDField: React.FC<FieldProps> = ({ field, formField, commonProps }) => (
    <FieldWrapper label={commonProps.label}>
        <div className="flex gap-2">
            <Input
                {...formField}
                value={getValueOrDefault(formField.value, field.defaultValue)}
                className="font-mono"
            />
            <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => console.log('UUID field data:', formField)}
            >
                <Copy className="h-4 w-4" />
            </Button>
        </div>
    </FieldWrapper>
);

const NumberField: React.FC<FieldProps> = ({ field, formField, commonProps }) => (
    <FieldWrapper label={commonProps.label}>
        <Input
            type="number"
            {...formField}
            value={getValueOrDefault(formField.value, field.defaultValue)}
            onChange={(e) => formField.onChange(Number(e.target.value))}
        />
    </FieldWrapper>
);

const BooleanField: React.FC<FieldProps> = ({ field, formField, commonProps }) => (
    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
            <FormLabel>{commonProps.label}</FormLabel>
        </div>
        <FormControl>
            <Switch
                checked={getValueOrDefault(formField.value, field.defaultValue)}
                onCheckedChange={formField.onChange}
            />
        </FormControl>
    </FormItem>
);

const DateField: React.FC<FieldProps> = ({ field, formField, commonProps }) => (
    <FormItem className="flex flex-col">
        <FormLabel>{commonProps.label}</FormLabel>
        <DatePicker
            value={getValueOrDefault(formField.value, field.defaultValue)}
            onChange={formField.onChange}
        />
    </FormItem>
);

const ObjectField: React.FC<FieldProps> = ({ field, formField, commonProps }) => (
    <FieldWrapper label={commonProps.label}>
        <div className="w-full">
            <EnhancedJsonViewer
                data={getValueOrDefault(formField.value, field.defaultValue || {})}
                title={field.name}
                allowMinimize={true}
                maxHeight="200px"
                className="w-full"
            />
        </div>
    </FieldWrapper>
);

const UnhandledField: React.FC<FieldProps> = ({ field, formField, commonProps }) => (
    <FormItem>
        <FormLabel className="text-destructive">
            {commonProps.label} (Unhandled type: {field.dataType})
        </FormLabel>
        <FormControl>
            <Textarea
                {...formField}
                value={getValueOrDefault(formField.value, field.defaultValue)}
                className="border-destructive"
            />
        </FormControl>
        <FormDescription className="text-destructive">
            Unsupported data type: {field.dataType}
        </FormDescription>
    </FormItem>
);

interface Field {
    name: string;
    displayName: string;
    dataType: string;
    isRequired?: boolean;
    isDisplayField?: boolean;
    isPrimaryKey?: boolean;
    maxLength?: number;
    defaultValue?: any;
    [key: string]: any;
}

interface RenderFieldProps {
    field: Field;
    form: any;
}

// Main render function
const renderField = ({ field, form }: RenderFieldProps) => {
    const commonProps: CommonProps = {
        control: form.control,
        name: field.name,
        label: field.displayName,
        required: field.isRequired,
        isDisplayField: field.isDisplayField,
        isPrimaryKey: field.isPrimaryKey,
        dataType: field.dataType,
        isArray: field.isArray,
        structure: field.structure,
        isNative: field.isNative,
        defaultComponent: field.defaultComponent,
        componentProps: field.componentProps,
        maxLength: field.maxLength,
        defaultValue: field.defaultValue,
        defaultGeneratorFunction: field.defaultGeneratorFunction,
        validationFunctions: field.validationFunctions,
        exclusionRules: field.exclusionRules,
        enumValues: field.enumValues,
        databaseTable: field.databaseTable,
    };

    const fieldComponents: Record<string, React.FC<FieldProps>> = {
        string: StringField,
        uuid: UUIDField,
        number: NumberField,
        boolean: BooleanField,
        date: DateField,
        object: ObjectField,
    };

    return (
        <FormField
            {...commonProps}
            render={({ field: formField }) => {
                const FieldComponent = fieldComponents[field.dataType] || UnhandledField;
                return <FieldComponent field={field} formField={formField} commonProps={commonProps} />;
            }}
        />
    );
};

export default renderField;
