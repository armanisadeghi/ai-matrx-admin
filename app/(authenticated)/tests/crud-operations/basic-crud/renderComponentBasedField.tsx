import React from 'react';
import {useForm} from 'react-hook-form';
import {
    Form,
    FormField,
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
import {DatePicker} from '@/components/ui/date-picker';
import {EnhancedJsonViewer, FullJsonViewer} from '@/components/ui';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {EntityStateField} from "@/lib/redux/entity/types/stateTypes";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

import {Badge} from '@/components/ui/badge';
import {RelatedInput, RelatedTextarea} from '@/lib/redux/form/advanced-fields/RelationshipComponents';
import {cn} from "@heroui/react";
import { Edit, Copy, Link, Globe, Calendar, Clock, Plus } from "lucide-react";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";

interface FieldWrapperProps {
    field: EntityStateField;
    formField: any;
    children: React.ReactNode;
    showEditDialog?: boolean;
    renderEditContent?: () => React.ReactNode;
    onEdit?: () => void;
    className?: string;
}

export const FieldWrapper: React.FC<FieldWrapperProps> = (
    {
        field,
        formField,
        children,
        showEditDialog = false,
        renderEditContent,
        onEdit,
        className
    }) => {
    const getFieldIcon = () => {
        switch (field.dataType) {
            case 'uuid':
                return <Copy className="h-4 w-4"/>;
            case 'datetime':
                return (
                    <div className="flex gap-1">
                        <Calendar className="h-4 w-4"/>
                        <Clock className="h-4 w-4"/>
                    </div>
                );
            case 'object':
                return <Link className="h-4 w-4"/>;
            case 'url':
                return <Globe className="h-4 w-4"/>;
            default:
                return <Edit className="h-4 w-4"/>;
        }
    };

    return (
        <div className={cn(
            "grid grid-cols-[200px,1fr] gap-4 items-start py-2",
            className
        )}>
            {/* Label Section */}
            <div className="space-y-1">
                <FormLabel className="text-sm font-medium">
                    {field.displayName}
                </FormLabel>
                {field.description && (
                    <FormDescription className="text-xs">
                        {field.description}
                    </FormDescription>
                )}
                {field.isRequired && (
                    <span className="text-xs text-muted-foreground">Required</span>
                )}
            </div>

            {/* Field Section */}
            <div className="relative">
                {showEditDialog ? (
                    <Dialog>
                        <div className="relative group">
                            {children}
                            <DialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={onEdit}
                                >
                                    {getFieldIcon()}
                                </Button>
                            </DialogTrigger>
                        </div>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    Edit {field.displayName}
                                </DialogTitle>
                            </DialogHeader>
                            {renderEditContent?.()}
                        </DialogContent>
                    </Dialog>
                ) : (
                     children
                 )}
                <FormMessage/>
            </div>
        </div>
    );
};

interface ComponentBasedFieldViewProps {
    fieldInfo: EntityStateField[];
    initialValues?: any;
}

interface SmartFieldProps {
    field: EntityStateField;
    value: any;
    onChange: (value: any) => void;
    onBlur: () => void;
    ref: React.Ref<HTMLInputElement | HTMLTextAreaElement>;
    className?: string;
}

const ComponentBasedFieldView: React.FC<ComponentBasedFieldViewProps> = (
    {
        fieldInfo,
        initialValues = {},
    }) => {
    const form = useForm({
        defaultValues: initialValues
    });

    const handleRelatedClick = (fieldName: string) => {
        console.log(`Viewing related data for: ${fieldName}`);
    };

    const parseComponentString = (componentStr: string = 'input') => {
        const [baseComponent, ...params] = componentStr.split(':');
        return {
            type: baseComponent,
            params: params
        };
    };

    const getValueOrDefault = (value: any, defaultValue: any) => value ?? defaultValue;

    const handleUUIDCopy = (fieldData) => {
        console.log('UUID field data:', fieldData);
    };

    const getComponentProps = (props: any) => {
        return Object.entries(props).reduce((acc, [key, value]) => {
            if (value !== 'default') acc[key] = value;
            return acc;
        }, {});
    };


    const renderField = (field: EntityStateField) => {
        const commonProps = {
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
            isRequired: field.isRequired,
            maxLength: field.maxLength,
            defaultValue: field.defaultValue,
            defaultGeneratorFunction: field.defaultGeneratorFunction,
            validationFunctions: field.validationFunctions,
            exclusionRules: field.exclusionRules,
            enumValues: field.enumValues,
            databaseTable: field.databaseTable,
        };

        const {type, params} = parseComponentString(field.defaultComponent);

        switch (type) {
            case 'RelatedInput':
                return (
                    <FormField
                        {...commonProps}
                        render={({field: formField}) => (
                            <FormItem>
                                <RelatedInput
                                    field={field}
                                    value={formField.value}
                                    onChange={formField.onChange}
                                    onBlur={formField.onBlur}
                                    ref={formField.ref}
                                    className={cn(
                                        "w-full",
                                        field.isRequired && "required",
                                        field.isPrimaryKey && "primary-key"
                                    )}
                                />
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                );

            case 'RelatedTextarea':
                return (
                    <FormField
                        {...commonProps}
                        render={({field: formField}) => (
                            <FormItem>
                                <RelatedTextarea
                                    field={field}
                                    value={formField.value}
                                    onChange={formField.onChange}
                                    onBlur={formField.onBlur}
                                    ref={formField.ref}
                                    className={cn(
                                        "w-full min-h-[100px]",
                                        field.isRequired && "required",
                                        field.isPrimaryKey && "primary-key"
                                    )}
                                />
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                );

            case 'input':
                if (field.dataType === 'uuid') {
                    return (
                        <FormField
                            {...commonProps}
                            render={({field: formField}) => (
                                <FormItem>
                                    <FormLabel>{commonProps.label}</FormLabel>
                                    <div className="flex gap-2">
                                        <FormControl>
                                            <Input
                                                {...formField}
                                                value={getValueOrDefault(formField.value, field.defaultValue)}
                                                className="font-mono"
                                            />
                                        </FormControl>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleUUIDCopy(field)}
                                        >
                                            <Copy className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                    );
                }
                return (
                    <FormField
                        {...commonProps}
                        render={({field: formField}) => (
                            <FormItem>
                                <FormLabel>{commonProps.label}</FormLabel>
                                <FormControl>
                                    <Input
                                        {...formField}
                                        value={getValueOrDefault(formField.value, field.defaultValue)}
                                        maxLength={params[0] ? parseInt(params[0]) : undefined}
                                    />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                );

            case 'textarea':
                return (
                    <FormField
                        {...commonProps}
                        render={({field: formField}) => (
                            <FormItem>
                                <FormLabel>{commonProps.label}</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...formField}
                                        value={getValueOrDefault(formField.value, field.defaultValue)}
                                        rows={params[0] ? parseInt(params[0]) : 3}
                                    />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                );

            case 'switch':
                return (
                    <FormField
                        {...commonProps}
                        render={({field: formField}) => (
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
                        )}
                    />
                );

            case 'json-editor':
            case 'json-array':
                return (
                    <FormField
                        {...commonProps}
                        render={({field: formField}) => (
                            <FormItem>
                                <FormLabel>{commonProps.label}</FormLabel>
                                <FormControl>
                                    <div className="w-full">
                                        <EnhancedJsonViewer
                                            data={getValueOrDefault(formField.value, field.defaultValue || (type === 'json-array'
                                                                                                            ? [] : {}))}
                                            title={field.name}
                                            allowMinimize={true}
                                            maxHeight={params[0] || "200px"}
                                            className="w-full"
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                );

            case 'number':
                const numberProps = {
                    type: "number",
                    step: params[0] === 'float' ? '0.01' : '1',
                    min: params[0] === 'smallint' ? -32768 : undefined,
                    max: params[0] === 'smallint' ? 32767 : undefined,
                };
                return (
                    <FormField
                        {...commonProps}
                        render={({field: formField}) => (
                            <FormItem>
                                <FormLabel>{commonProps.label}</FormLabel>
                                <FormControl>
                                    <Input
                                        {...formField}
                                        {...numberProps}
                                        value={getValueOrDefault(formField.value, field.defaultValue)}
                                        onChange={(e) => formField.onChange(Number(e.target.value))}
                                    />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                );
            case 'select':
                if (type === 'select' && params[0] === 'enum' && field.enumValues) {
                    return (
                        <FormField
                            {...commonProps}
                            render={({field: formField}) => (
                                <FormItem>
                                    <FormLabel>{commonProps.label}</FormLabel>
                                    <Select
                                        onValueChange={formField.onChange}
                                        defaultValue={getValueOrDefault(formField.value, field.defaultValue)}
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
                            )}
                        />
                    );
                }

                // For non-enum selects (fallback)
                return (
                    <FormField
                        {...commonProps}
                        render={({field: formField}) => (
                            <FormItem>
                                <FormLabel>{commonProps.label}</FormLabel>
                                <FormControl>
                                    <div className="flex gap-2 items-center">
                                        <Input
                                            {...formField}
                                            value={getValueOrDefault(formField.value, field.defaultValue)}
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
                        )}
                    />
                );
            case 'datetime':
                return (
                    <FormField
                        {...commonProps}
                        render={({field: formField}) => (
                            <FormItem>
                                <FormLabel>{commonProps.label}</FormLabel>
                                <FormControl>
                                    <DatePicker
                                        value={formField.value ? new Date(formField.value) : undefined}
                                        onChange={(date) => {
                                            formField.onChange(date?.toISOString() || null);
                                            formField.onBlur(); // Trigger form validation
                                        }}
                                        placeholder={field.componentProps?.placeholder || "Select date"}
                                        className={cn(
                                            "w-full",
                                            field.componentProps?.className,
                                            field.isRequired && "required",
                                            field.isPrimaryKey && "primary-key"
                                        )}
                                        buttonVariant={field.componentProps?.variant || "outline"}
                                        formatString={field.componentProps?.formatString || "PPP"}
                                        calendarProps={{
                                            disabled: field.componentProps?.disabled,
                                            fromDate: field.componentProps?.minDate
                                                      ? new Date(field.componentProps.minDate) : undefined,
                                            toDate: field.componentProps?.maxDate
                                                    ? new Date(field.componentProps.maxDate) : undefined,
                                            ...field.componentProps?.calendarProps
                                        }}
                                    />
                                </FormControl>
                                {formField.value && field.componentProps?.showTime !== false && (
                                    <FormDescription className="text-sm text-muted-foreground">
                                        {new Date(formField.value).toLocaleTimeString()}
                                    </FormDescription>
                                )}
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                );

            case 'inline-form':
                return (
                    <FormField
                        {...commonProps}
                        render={({field: formField}) => (
                            <FormItem>
                                <FormLabel>{commonProps.label}</FormLabel>
                                <div className="flex flex-wrap gap-3 items-start">
                                    {/* Primary Input */}
                                    <div className="basis-[200px] grow">
                                        <Input
                                            {...formField}
                                            value={getValueOrDefault(formField.value, field.defaultValue)}
                                            placeholder="Primary Value"
                                        />
                                    </div>

                                    {/* Secondary Input */}
                                    <div className="basis-[200px] grow">
                                        <Input
                                            disabled
                                            placeholder="Secondary Input"
                                        />
                                    </div>

                                    {/* Small Textarea */}
                                    <div className="basis-[250px] grow">
                                        <Textarea
                                            disabled
                                            placeholder="Brief Description"
                                            className="h-[38px] min-h-[38px] resize-none"
                                        />
                                    </div>

                                    {/* Larger Textarea */}
                                    <div className="basis-[300px] grow">
                                        <Textarea
                                            disabled
                                            placeholder="Detailed Notes"
                                            className="h-[38px] min-h-[38px] resize-none"
                                        />
                                    </div>

                                    {/* Select */}
                                    <div className="basis-[180px] grow">
                                        <Select disabled>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Type"/>
                                            </SelectTrigger>
                                        </Select>
                                    </div>

                                    {/* JSON Preview - Modified */}
                                    <div className="basis-[250px] grow">
                                        <FullJsonViewer
                                            data={{"status": "pending"}}
                                            title="JSON Preview"
                                            maxHeight="38px"
                                            className="!p-2 !bg-muted/20"
                                            disabled={true}
                                            hideControls={true}
                                            hideTitle={true}
                                        />
                                    </div>

                                    {/* Add Button */}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="shrink-0 h-[38px]"
                                        disabled
                                    >
                                        <Plus className="h-4 w-4"/>
                                    </Button>
                                </div>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                );

            default:
                return (
                    <FormField
                        {...commonProps}
                        render={({field: formField}) => (
                            <FormItem>
                                <FormLabel className="text-destructive">
                                    {commonProps.label} (Unhandled component: {type})
                                </FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...formField}
                                        value={getValueOrDefault(formField.value, field.defaultValue)}
                                        className="border-destructive"
                                    />
                                </FormControl>
                                <FormDescription className="text-destructive">
                                    Unsupported component type: {type}
                                </FormDescription>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                );
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Component-Based View</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form className="space-y-4">
                        {fieldInfo.map(field => (
                            <div key={field.name}>
                                {renderField(field)}
                            </div>
                        ))}
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};

export default ComponentBasedFieldView;


// In your renderField function
const renderField = (field: EntityStateField) => {
    return (
        <FormField
            control={form.control}
            name={field.name}
            render={({field: formField}) => (
                <FieldWrapper
                    field={field}
                    formField={formField}
                    showEditDialog={['json', 'object', 'datetime'].includes(field.dataType)}
                    renderEditContent={() => (
                        // Render modal content based on field type
                        (<div className="space-y-4">
                            {/* Custom edit content */}
                        </div>)
                    )}
                >
                    {/* Your existing field rendering logic here */}
                    {renderFieldContent(field, formField)}
                </FieldWrapper>
            )}
        />
    );
};

// Separate function for field content rendering
const renderFieldContent = (field: EntityStateField, formField: any) => {
    const { type, params } = parseComponentString(field.defaultComponent);

    switch (type) {
        case 'input':
            return (
                <Input
                    {...formField}
                    value={getValueOrDefault(formField.value, field.defaultValue)}
                    className={cn(
                        field.dataType === 'uuid' && "font-mono",
                        "w-full"
                    )}
                />
            );
        // ... other cases
    }
};
