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
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Badge} from '@/components/ui/badge';
import {Copy, Plus} from "lucide-react";
import {EnhancedJsonViewer, FullJsonViewer} from '@/components/ui';
import {EntityKeys} from "@/types/entityTypes";
import {useAppDispatch, useAppSelector} from "@/lib/redux/hooks";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import {getEntitySlice} from '@/lib/redux/entity/entitySlice';

// Types
interface EntityStateField {
    name: string;
    displayName: string;
    description?: string;
    isRequired?: boolean;
    isPrimaryKey?: boolean;
    dataType: string;
    isArray?: boolean;
    structure?: string;
    defaultComponent?: string;
    componentProps?: any;
    defaultValue?: any;
    enumValues?: string[];
    databaseTable?: string;
}

interface FieldProps {
    field: EntityStateField;
    formField: any;
    label?: string;
}

// UUID Field Component
const UUIDField: React.FC<FieldProps> = ({field, formField}) => {
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
const TextField: React.FC<FieldProps> = ({field, formField}) => {
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
const TextareaField: React.FC<FieldProps> = ({field, formField}) => {
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
const SwitchField: React.FC<FieldProps> = ({field, formField}) => {
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
const JSONField: React.FC<FieldProps> = ({field, formField}) => {
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
const NumberField: React.FC<FieldProps> = ({field, formField}) => {
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
const SelectField: React.FC<FieldProps> = ({field, formField}) => {
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

// Inline Form Field Component
const InlineFormField: React.FC<FieldProps> = ({field, formField}) => {
    return (
        <FormItem>
            <FormLabel>{field.displayName}</FormLabel>
            <div className="flex flex-wrap gap-3 items-start">
                <div className="basis-[200px] grow">
                    <Input
                        {...formField}
                        value={formField.value ?? field.defaultValue}
                        placeholder="Primary Value"
                    />
                </div>
                <div className="basis-[200px] grow">
                    <Input
                        disabled
                        placeholder="Secondary Input"
                    />
                </div>
                <div className="basis-[250px] grow">
                    <Textarea
                        disabled
                        placeholder="Brief Description"
                        className="h-[38px] min-h-[38px] resize-none"
                    />
                </div>
                <div className="basis-[300px] grow">
                    <Textarea
                        disabled
                        placeholder="Detailed Notes"
                        className="h-[38px] min-h-[38px] resize-none"
                    />
                </div>
                <div className="basis-[180px] grow">
                    <Select disabled>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Type"/>
                        </SelectTrigger>
                    </Select>
                </div>
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
    );
};

interface BaseFieldProps {
    field: EntityStateField;
    formField: any;
    value: any;
}

// Dynamic field factory component
const FieldFactory: React.FC<BaseFieldProps> = ({field, formField, value}) => {
    const [componentType] = (field.defaultComponent || 'input').split(':');

    const commonProps = {
        field,
        formField,
        value
    };

    const components: Record<string, React.FC<BaseFieldProps>> = {
        uuid: UUIDField,
        text: TextField,
        textarea: TextareaField,
        switch: SwitchField,
        'json-editor': JSONField,
        'json-array': JSONField,
        number: NumberField,
        select: SelectField,
        'inline-form': InlineFormField,
    };

    const Component = components[componentType] || TextField;
    return <Component {...commonProps} />;
};

interface ComponentBasedFieldViewProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
}

const ComponentBasedFieldView = <TEntity extends EntityKeys>(
    {
        entityKey
    }: ComponentBasedFieldViewProps<TEntity>) => {
    const dispatch = useAppDispatch();
    const selectors = React.useMemo(
        () => createEntitySelectors(entityKey),
        [entityKey]
    );
    const {actions} = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);
    const fields = useAppSelector(selectors.selectFieldInfo);
    const defaultValues = useAppSelector(selectors.selectDefaultValues);
    const {matrxRecordId, record: activeRecord} = useAppSelector(
        selectors.selectActiveRecordWithId
    );
    const form = useForm<Record<string, any>>({
        defaultValues: React.useMemo(() => ({
            ...defaultValues,
            ...activeRecord
        }), [defaultValues, activeRecord]) as Record<string, any>
    });

    React.useEffect(() => {
        if (activeRecord) {
            Object.entries(activeRecord).forEach(([key, value]) => {
                form.setValue(key, value, {
                    shouldDirty: false,
                    shouldTouch: false,
                    shouldValidate: false
                });
            });
        }
    }, [activeRecord, form]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Dynamic Field View</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form className="space-y-4">
                        {fields.map(field => (
                            <FormField
                                key={field.name}
                                control={form.control}
                                name={field.name as any}
                                render={({field: formField}) => (
                                    <FieldFactory
                                        field={field}
                                        formField={formField}
                                        value={activeRecord?.[field.name]}
                                    />
                                )}
                            />
                        ))}
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};

export default ComponentBasedFieldView;
