import React from 'react';
import {FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Switch} from '@/components/ui/switch';
import {Button} from '@/components/ui/button';
import {Copy} from 'lucide-react';
import {DatePicker} from '@/components/ui/date-picker';
import {EnhancedJsonViewer} from '@/components/ui';
import {EntityKeys} from "@/types/entityTypes";
import {FieldTooltip} from "@/app/(authenticated)/tests/crud-operations/components/helperComponents";

// Type definitions
interface UseEntityFormState<TEntity extends EntityKeys> {
    getFieldValue: (fieldName: string) => any;
    isFieldReadOnly: (fieldName: string) => boolean;
    handleFieldChange: (fieldName: string, value: any) => void;
    validationErrors: Record<string, string>;
    fieldInfo: EntityStateField[];
}

interface EntityStateField {
    name: string;
    displayName: string;
    dataType: string;
    isRequired?: boolean;
    isDisplayField?: boolean;
    isPrimaryKey?: boolean;
    maxLength?: number;
    defaultValue?: any;
    description?: string;

    [key: string]: any;
}

interface FieldWrapperProps {
    label: string;
    description?: string;
    children: React.ReactNode;
    error?: string;
    isRequired?: boolean;
}

interface FieldComponentProps {
    field: EntityStateField;
    value: any;
    isReadOnly: boolean;
    onChange: (value: any) => void;
    error?: string;
}

const getValueOrDefault = (value: any, defaultValue: any) => value ?? defaultValue;

// Base wrapper component for consistent layout
const FieldWrapper: React.FC<FieldWrapperProps> = ({
                                                       label,
                                                       description,
                                                       children,
                                                       error,
                                                       isRequired
                                                   }) => (
    <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-2">
            <div className="w-1/4 flex items-center gap-2">
        <span className="text-md font-medium truncate">
          {label}
            {isRequired && <span className="text-destructive ml-1">*</span>}
        </span>
                {description && <FieldTooltip description={description}/>}
            </div>
            <div className="flex-1">
                {children}
                {error && <span className="text-destructive text-sm mt-1">{error}</span>}
            </div>
        </div>
    </div>
);

// Individual field components
const StringField: React.FC<FieldComponentProps> = ({
                                                        field,
                                                        value,
                                                        isReadOnly,
                                                        onChange,
                                                        error
                                                    }) => (
    <FieldWrapper
        label={field.displayName}
        description={field.description}
        error={error}
        isRequired={field.isRequired}
    >
        {field.maxLength > 255 ? (
            <Textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={isReadOnly}
                placeholder={field.defaultValue || ''}
                maxLength={field.maxLength}
                className="w-full"
            />
        ) : (
             <Input
                 value={value}
                 onChange={(e) => onChange(e.target.value)}
                 disabled={isReadOnly}
                 placeholder={field.defaultValue || ''}
                 maxLength={field.maxLength}
                 className="w-full"
             />
         )}
    </FieldWrapper>
);

const UUIDField: React.FC<FieldComponentProps> = ({
                                                      field,
                                                      value,
                                                      isReadOnly,
                                                      onChange,
                                                      error
                                                  }) => (
    <FieldWrapper
        label={field.displayName}
        description={field.description}
        error={error}
        isRequired={field.isRequired}
    >
        <div className="flex gap-2">
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={isReadOnly}
                className="font-mono w-full"
                placeholder={field.defaultValue || ''}
            />
            <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => navigator.clipboard.writeText(value)}
                disabled={isReadOnly}
            >
                <Copy className="h-4 w-4"/>
            </Button>
        </div>
    </FieldWrapper>
);

const NumberField: React.FC<FieldComponentProps> = ({
                                                        field,
                                                        value,
                                                        isReadOnly,
                                                        onChange,
                                                        error
                                                    }) => (
    <FieldWrapper
        label={field.displayName}
        description={field.description}
        error={error}
        isRequired={field.isRequired}
    >
        <Input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={isReadOnly}
            placeholder={field.defaultValue?.toString() || ''}
            className="w-full"
        />
    </FieldWrapper>
);

const BooleanField: React.FC<FieldComponentProps> = ({
                                                         field,
                                                         value,
                                                         isReadOnly,
                                                         onChange,
                                                         error
                                                     }) => (
    <FieldWrapper
        label={field.displayName}
        description={field.description}
        error={error}
        isRequired={field.isRequired}
    >
        <Switch
            checked={value}
            onCheckedChange={onChange}
            disabled={isReadOnly}
        />
    </FieldWrapper>
);

const DateField: React.FC<FieldComponentProps> = ({
                                                      field,
                                                      value,
                                                      isReadOnly,
                                                      onChange,
                                                      error
                                                  }) => (
    <FieldWrapper
        label={field.displayName}
        description={field.description}
        error={error}
        isRequired={field.isRequired}
    >
        <DatePicker
            value={value}
            onChange={onChange}
            //disabled={isReadOnly}
        />
    </FieldWrapper>
);

const ObjectField: React.FC<FieldComponentProps> = ({
                                                        field,
                                                        value,
                                                        isReadOnly,
                                                        error
                                                    }) => (
    <FieldWrapper
        label={field.displayName}
        description={field.description}
        error={error}
        isRequired={field.isRequired}
    >
        <div className="w-full">
            <EnhancedJsonViewer
                data={value || {}}
                title={field.name}
                allowMinimize={true}
                maxHeight="200px"
                className="w-full"
                disabled={isReadOnly}
            />
        </div>
    </FieldWrapper>
);

const UnhandledField: React.FC<FieldComponentProps> = (
    {
        field,
        value,
        isReadOnly,
        onChange,
        error
    }) => (
    <FieldWrapper
        label={`${field.displayName} (Unhandled type: ${field.dataType})`}
        description={field.description}
        error={error}
        isRequired={field.isRequired}
    >
        <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isReadOnly}
            placeholder={field.defaultValue || ''}
            className="w-full border-destructive"
        />
        <FormDescription className="text-destructive">
            Unsupported data type: {field.dataType}
        </FormDescription>
    </FieldWrapper>
);

// Field component mapping
const fieldComponents: Record<string, React.FC<FieldComponentProps>> = {
    string: StringField,
    uuid: UUIDField,
    number: NumberField,
    boolean: BooleanField,
    date: DateField,
    object: ObjectField,
};

// Form content component
interface FormContentProps<TEntity extends EntityKeys> {
    form: UseEntityFormState<TEntity>;
}

export const FormContent = <TEntity extends EntityKeys>({form}: FormContentProps<TEntity>) => {
    const renderField = React.useCallback((field: EntityStateField) => {
        const FieldComponent = fieldComponents[field.dataType] || UnhandledField;

        return (
            <FieldComponent
                key={field.name}
                field={field}
                value={form.getFieldValue(field.name)}
                isReadOnly={form.isFieldReadOnly(field.name)}
                onChange={(newValue) => form.handleFieldChange(field.name, newValue)}
                error={form.validationErrors[field.name]}
            />
        );
    }, [form]);

    return (
        <div className="space-y-4">
            {form.fieldInfo.map(renderField)}
        </div>
    );
};

export default FormContent;
