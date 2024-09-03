import React from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import * as z from 'zod';
import {Form, FormField, FormItem, FormLabel, FormControl, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Button} from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

interface FieldConfig {
    type: 'text' | 'textarea' | 'select';
    label: string;
    options?: { value: string; label: string }[];
}

interface GenericFormProps<T extends z.ZodType<any, any>> {
    schema: T;
    initialData?: z.infer<T>;
    onSubmit: (data: z.infer<T>) => void;
    isEditing: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onCancel: () => void;
    fields: Record<string, FieldConfig>;
}

export function GenericForm<T extends z.ZodType<any, any>>(
    {
        schema,
        initialData,
        onSubmit,
        isEditing,
        onEdit,
        onDelete,
        onCancel,
        fields,
    }: GenericFormProps<T>) {
    const form = useForm<z.infer<T>>({
        resolver: zodResolver(schema),
        defaultValues: initialData || {} as z.infer<T>,
    });

    const renderField = (name: string, config: FieldConfig) => {
        return (
            <FormField
                key={name}
                control={form.control}
                name={name as any}
                render={({field}) => (
                    <FormItem>
                        <FormLabel>{config.label}</FormLabel>
                        <FormControl>
                            {config.type === 'textarea' ? (
                                <Textarea {...field} disabled={!isEditing}/>
                            ) : config.type === 'select' ? (
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    disabled={!isEditing}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an option"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {config.options?.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input {...field} disabled={!isEditing}/>
                            )}
                        </FormControl>
                        <FormMessage/>
                    </FormItem>
                )}
            />
        );
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {Object.entries(fields).map(([name, config]) => renderField(name, config))}
                <div className="flex space-x-2">
                    {isEditing ? (
                        <>
                            <Button type="submit">Save</Button>
                            <Button type="button" variant="outline" onClick={onCancel}>
                                Cancel
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button type="button" onClick={onEdit}>
                                Edit
                            </Button>
                            <Button type="button" variant="destructive" onClick={onDelete}>
                                Delete
                            </Button>
                        </>
                    )}
                </div>
            </form>
        </Form>
    );
}
