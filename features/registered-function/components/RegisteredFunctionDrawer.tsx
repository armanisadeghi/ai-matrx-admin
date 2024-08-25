// File Location: @/features/registered-function/components/RegisteredFunctionDrawer

import React, { useEffect } from 'react';
import { useRegisteredFunctionCRUD } from '../hooks/useRegisteredFunctionCRUD';
import { RegisteredFunctionType } from '@/types/registeredFunctionTypes';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';
import {PayloadAction, SerializedError} from '@reduxjs/toolkit';

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    modulePath: z.string().min(1, "Module path is required"),
    className: z.string().optional(),
    description: z.string().optional(),
    returnBroker: z.string().optional(),
    arg: z.string().optional(),
    systemFunction: z.string().optional(),
    recipeFunction: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

type FunctionEditDrawerProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    functionId?: string;
};

export const FunctionEditDrawer: React.FC<FunctionEditDrawerProps> = ({isOpen, onOpenChange, functionId}) => {
    const { create, update, fetchById } = useRegisteredFunctionCRUD();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            modulePath: '',
            className: '',
            description: '',
            returnBroker: '',
            arg: '',
            systemFunction: '',
            recipeFunction: '',
        },
    });

    useEffect(() => {
        if (functionId && isOpen) {
            fetchById(functionId).then((action: PayloadAction<RegisteredFunctionType, string, { arg: string; requestId: string; requestStatus: "fulfilled"; }, never> | PayloadAction<unknown, string, { arg: string; requestId: string; requestStatus: "rejected"; aborted: boolean; condition: boolean; } & ({ rejectedWithValue: true; } | ({ rejectedWithValue: false; } & {})), SerializedError>) => {
                if (action.meta.requestStatus === 'fulfilled' && 'payload' in action) {
                    const fetchedFunction = action.payload as RegisteredFunctionType;
                    // Transform the fetched data to match the form schema
                    const formData: FormData = {
                        name: fetchedFunction.name || '',
                        modulePath: fetchedFunction.modulePath || '',
                        className: fetchedFunction.className || '',
                        description: fetchedFunction.description || '',
                        returnBroker: fetchedFunction.returnBroker || '',
                        arg: Array.isArray(fetchedFunction.arg) ? fetchedFunction.arg.join(', ') : fetchedFunction.arg || '',
                        systemFunction: Array.isArray(fetchedFunction.systemFunction) ? fetchedFunction.systemFunction.join(', ') : fetchedFunction.systemFunction || '',
                        recipeFunction: Array.isArray(fetchedFunction.recipeFunction) ? fetchedFunction.recipeFunction.join(', ') : fetchedFunction.recipeFunction || '',
                    };
                    form.reset(formData);
                }
            });
        } else if (!functionId && isOpen) {
            form.reset({
                name: '',
                modulePath: '',
                className: '',
                description: '',
                returnBroker: '',
                arg: '',
                systemFunction: '',
                recipeFunction: '',
            });
        }
    }, [functionId, isOpen, fetchById, form]);

    const onSubmit = async (data: FormData) => {
        try {
            const convertedData: Partial<RegisteredFunctionType> = {
                ...data,
                arg: data.arg ? data.arg.split(',').map(s => s.trim()) : undefined,
                systemFunction: data.systemFunction ? data.systemFunction.split(',').map(s => s.trim()) : undefined,
                recipeFunction: data.recipeFunction ? data.recipeFunction.split(',').map(s => s.trim()) : undefined,
            };

            if (functionId) {
                await update({ ...convertedData, id: functionId } as RegisteredFunctionType);
                toast({
                    title: "Function updated",
                    description: "The function has been successfully updated.",
                });
            } else {
                await create(convertedData as Omit<RegisteredFunctionType, 'id'>);
                toast({
                    title: "Function created",
                    description: "A new function has been successfully created.",
                });
            }
            onOpenChange(false);
        } catch (error) {
            toast({
                title: "Error",
                description: "An error occurred while saving the function.",
                variant: "destructive",
            });
        }
    };

    return (
        <Drawer open={isOpen} onOpenChange={onOpenChange}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>{functionId ? 'Edit Function' : 'Create New Function'}</DrawerTitle>
                    <DrawerDescription>
                        {functionId ? 'Make changes to the function here.' : 'Add the details for the new function here.'}
                    </DrawerDescription>
                </DrawerHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
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
                                        <Input {...field} />
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
                                        <Input {...field} />
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
                                        <Textarea {...field} />
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
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="arg"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Arguments</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
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
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="recipeFunction"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Recipe Function</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
                <DrawerFooter>
                    <Button type="submit" onClick={form.handleSubmit(onSubmit)}>
                        {functionId ? 'Update Function' : 'Create Function'}
                    </Button>
                    <DrawerClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
};

export default FunctionEditDrawer;
