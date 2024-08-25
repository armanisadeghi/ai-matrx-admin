// File Location: @/features/registered-function/components/RegisteredFunctionDrawer.tsx

import React, {useEffect} from 'react';
import {useRegisteredFunctionCRUD} from '../hooks/useRegisteredFunctionCRUD';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose
} from '@/components/ui/drawer';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Form, FormField, FormItem, FormLabel, FormControl, FormMessage} from '@/components/ui/form';
import {toast} from '@/components/ui/use-toast';
import {RegisteredFunctionType, FormData, formSchema} from "@/types/registeredFunctionTypes";

type FunctionEditDrawerProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    functionId?: string;
};

export const FunctionEditDrawer: React.FC<FunctionEditDrawerProps> = ({isOpen, onOpenChange, functionId}) => {
    const {prepareForm, save} = useRegisteredFunctionCRUD();

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
        if (isOpen) {
            prepareForm(functionId).then((action) => {
                if (action.meta.requestStatus === 'fulfilled') {
                    form.reset(action.payload as FormData);
                }
            });
        }
    }, [functionId, isOpen, prepareForm, form]);

    const onSubmit = async (data: FormData) => {
        try {
            const result = await save(data, functionId);
            if (result.meta.requestStatus === 'fulfilled') {
                toast({
                    title: functionId ? "Function updated" : "Function created",
                    description: functionId ? "The function has been successfully updated." : "A new function has been successfully created.",
                });
                onOpenChange(false);
            } else {
                throw new Error('Save operation failed');
            }
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
