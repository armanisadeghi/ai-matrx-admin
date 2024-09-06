import React from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {
    FormData,
    FormDataSchema,
    RegisteredFunctionTypeEnum,
    RegisteredFunctionUnion,
    RegisteredFunctionUnionSchema
} from '@/types/registeredFunctionTypes';
import {Form, FormField, FormItem, FormLabel, FormControl, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Button} from '@/components/ui/button';

interface RegisteredFunctionFormProps {
    initialData?: RegisteredFunctionUnion;
    onSubmit: (data: RegisteredFunctionUnion) => void;
    isEditing: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onCancel: () => void;
}

export function RegisteredFunctionForm(
    {
        initialData,
        onSubmit,
        isEditing,
        onEdit,
        onDelete,
        onCancel,
    }: RegisteredFunctionFormProps) {
    const form = useForm<RegisteredFunctionUnion>({
        resolver: zodResolver(RegisteredFunctionUnionSchema),
        defaultValues: initialData || {
            id: '',
            name: '',
            modulePath: '',
            className: '',
            description: '',
            returnBroker: '',
            type: RegisteredFunctionTypeEnum.Base,
        },
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={!isEditing}/>
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="modulePath"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Module Path</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={!isEditing}/>
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="className"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Class Name</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={!isEditing}/>
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea {...field} disabled={!isEditing}/>
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="returnBroker"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Return Broker</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={!isEditing}/>
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="args"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Arguments</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={!isEditing} value={JSON.stringify(field.value)}/>
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="systemFunction"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>System Function</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={!isEditing} value={JSON.stringify(field.value)}/>
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="recipeFunctions"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Recipe Functions</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={!isEditing} value={JSON.stringify(field.value)}/>
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="type"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Type</FormLabel>
                            <FormControl>
                                <select {...field} disabled={!isEditing}>
                                    {Object.entries(RegisteredFunctionTypeEnum).map(([key, value]) => (
                                        <option key={value} value={value}>
                                            {key}
                                        </option>
                                    ))}
                                </select>
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />
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
