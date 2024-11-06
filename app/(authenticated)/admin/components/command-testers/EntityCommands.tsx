/*
'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { createEntitySelectors } from '@/lib/redux/entity/entitySelectors';
import { createEntityActions } from '@/lib/redux/entity/entityActionCreator';
import { EntityKeys } from '@/types/entityTypes';
import {
    EntityCommandGroup,
    QuickEntityCommandGroup
} from '@/components/matrx/MatrxCommands/EntityCommand';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent
} from '@/components/ui/card';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {cn} from "@nextui-org/react";

// For testing, change this const to test different entities
const entityKey = 'userPreferences' as EntityKeys;

export default function EntityCommandTestPage() {
    const dispatch = useAppDispatch();
    const { toast } = useToast();

    // Create entity selectors and actions
    const entitySelectors = createEntitySelectors(entityKey);
    const entityActions = createEntityActions(entityKey);

    // Get entity state
    const data = useAppSelector(entitySelectors.selectData);
    const loading = useAppSelector(entitySelectors.selectLoading);
    const error = useAppSelector(entitySelectors.selectError);
    const schema = useAppSelector(entitySelectors.selectSchema);
    const activeItem = useAppSelector(entitySelectors.selectSelectedItem);

    // Fetch data on mount
    useEffect(() => {
        dispatch(entityActions.fetchAllRequest());
    }, [dispatch, entityActions]);

    // Render loading state
    if (loading && !data.length) {
        return (
            <div className="p-8">
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <Card className="m-8">
                <CardHeader>
                    <CardTitle className="text-destructive">Error</CardTitle>
                    <CardDescription>{error.message}</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="container mx-auto p-8 space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Entity Command Test: {entityKey}</CardTitle>
                                <CardDescription>
                                    Test various entity commands with dynamic data
                                </CardDescription>
                            </div>
                            <Badge variant="outline">
                                {data.length} Records
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/!* Top Actions *!/}
                        <div className="mb-4">
                            <QuickEntityCommandGroup
                                entityKey={entityKey}
                                data={data[0]}
                                index={0}
                                show={['create', 'refresh']}
                            />
                        </div>

                        {/!* Data Table *!/}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {schema && Object.keys(schema).map(field => (
                                        <TableHead key={field}>{field}</TableHead>
                                    ))}
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((item, index) => (
                                    <TableRow
                                        key={index}
                                        className={cn(
                                            "transition-colors",
                                            activeItem === index && "bg-muted/50"
                                        )}
                                    >
                                        {Object.entries(item).map(([key, value]) => (
                                            <TableCell key={key}>
                                                {typeof value === 'object'
                                                 ? JSON.stringify(value)
                                                 : String(value)
                                                }
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-right">
                                            <EntityCommandGroup
                                                entityKey={entityKey}
                                                data={item}
                                                index={index}
                                                commands={{
                                                    view: true,
                                                    edit: true,
                                                    expand: true,
                                                    delete: {
                                                        useCallback: true,
                                                        setActiveOnClick: true
                                                    }
                                                }}
                                                onCommandExecute={async (actionName, context) => {
                                                    toast({
                                                        title: `${actionName} executed`,
                                                        description: `Index: ${context.index}`
                                                    });
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
*/
