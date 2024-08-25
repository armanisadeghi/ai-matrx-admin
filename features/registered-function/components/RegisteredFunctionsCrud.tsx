// File Location: features/registered-function/components/RegisteredFunctionsCrud.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { useRegisteredFunctionCRUD } from '../hooks/useRegisteredFunctionCRUD';
import { RegisteredFunctionType, FormData, formSchema } from '@/types/registeredFunctionTypes';
import { PlusCircle, Edit, Trash2, Save, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const FunctionManagement: React.FC = () => {
    const {
        registeredFunctions,
        loading,
        error,
        fetchPaginated,
        remove,
        fetchFiltered,
        fetchWithChildren,
        prepareForm,
        save
    } = useRegisteredFunctionCRUD();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [filter, setFilter] = useState<{ field: keyof RegisteredFunctionType, value: string } | null>(null);
    const [selectedFunction, setSelectedFunction] = useState<RegisteredFunctionType | null>(null);

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
        if (filter) {
            fetchFiltered({[filter.field]: filter.value});
        } else {
            fetchPaginated(page, pageSize);
        }
    }, [fetchPaginated, fetchFiltered, page, pageSize, filter]);

    const onSubmit = async (data: FormData) => {
        await save(data, editingId || undefined);
        form.reset();
        setEditingId(null);
    };

    const handleEdit = async (rf: RegisteredFunctionType) => {
        const result = await prepareForm(rf.id);
        if (result.meta.requestStatus === 'fulfilled' && result.payload) {
            setEditingId(rf.id);
            form.reset(result.payload as FormData);
        }
    };

    const handleDelete = (id: string) => {
        remove(id);
    };

    const handleViewDetails = async (id: string) => {
        const action = await fetchWithChildren(id);
        if (action.meta.requestStatus === 'fulfilled' && 'payload' in action) {
            setSelectedFunction(action.payload as RegisteredFunctionType);
        } else {
            console.error('Failed to fetch function details');
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin"/>
        </div>
    );

    if (error) return (
        <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
    );

    return (
        <div className="container mx-auto p-4">
            <Card>
                <CardHeader>
                    <CardTitle>Function Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                            <div className="flex space-x-2">
                                <Button type="submit">
                                    {editingId ? <><Save className="mr-2 h-4 w-4"/> Update</> : <><PlusCircle className="mr-2 h-4 w-4"/> Add</>}
                                </Button>
                                {editingId && (
                                    <Button type="button" variant="outline" onClick={() => {
                                        setEditingId(null);
                                        form.reset();
                                    }}>
                                        <X className="mr-2 h-4 w-4"/> Cancel
                                    </Button>
                                )}
                            </div>
                        </form>
                    </Form>

                    <div className="mt-4 mb-4 flex space-x-2">
                        <Select onValueChange={(value) => setPageSize(Number(value))}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Page Size"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10 per page</SelectItem>
                                <SelectItem value="20">20 per page</SelectItem>
                                <SelectItem value="50">50 per page</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            placeholder="Filter by name"
                            onChange={(e) => setFilter({field: 'name', value: e.target.value})}
                        />
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Module Path</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {registeredFunctions.map(func => (
                                <TableRow key={func.id}>
                                    <TableCell>{func.name}</TableCell>
                                    <TableCell>{func.modulePath}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" onClick={() => handleEdit(func)}>
                                            <Edit className="h-4 w-4"/>
                                        </Button>
                                        <Button variant="ghost" onClick={() => handleDelete(func.id)}>
                                            <Trash2 className="h-4 w-4"/>
                                        </Button>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" onClick={() => handleViewDetails(func.id)}>
                                                    View Details
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Function Details</DialogTitle>
                                                </DialogHeader>
                                                <pre>{JSON.stringify(selectedFunction, null, 2)}</pre>
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="mt-4 flex justify-between">
                        <Button onClick={() => setPage(prev => Math.max(1, prev - 1))} disabled={page === 1}>
                            <ChevronLeft className="h-4 w-4 mr-2"/> Previous
                        </Button>
                        <Button onClick={() => setPage(prev => prev + 1)} disabled={registeredFunctions.length < pageSize}>
                            Next <ChevronRight className="h-4 w-4 ml-2"/>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default FunctionManagement;
