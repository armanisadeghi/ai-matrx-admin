// app/admin/command-test/page.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    EntityCommandGroup,
    QuickEntityCommandGroup,
    createEntityCommand
} from '@/components/matrx/MatrxCommands/EntityCommand';
import {createEntitySelectors} from '@/lib/redux/entity/entitySelectors';
import {createEntityActions} from '@/lib/redux/entity/entityActionCreator';

interface TestEntity {
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'archived';
    createdAt: string;
    updatedAt: string;
}

// Mock data
const mockData: TestEntity[] = Array.from({ length: 10 }, (_, i) => ({
    id: `test-${i + 1}`,
    name: `Test Entity ${i + 1}`,
    status: i % 3 === 0 ? 'active' : i % 3 === 1 ? 'inactive' : 'archived',
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - i * 43200000).toISOString(),
}));

export default function CommandTestPage() {
    const [activeTab, setActiveTab] = useState('basic');
    const [selectedItem, setSelectedItem] = useState<number | null>(null);

    const handleCommandExecute = async (actionName: string, context: any) => {
        console.log(`Executing ${actionName}:`, context);
    };

    const StatusBadge: React.FC<{ status: TestEntity['status'] }> = ({ status }) => {
        const variants = {
            active: 'bg-green-500/10 text-green-500 dark:bg-green-500/20',
            inactive: 'bg-yellow-500/10 text-yellow-500 dark:bg-yellow-500/20',
            archived: 'bg-gray-500/10 text-gray-500 dark:bg-gray-500/20'
        };

        return (
            <Badge variant="outline" className={variants[status]}>
                {status}
            </Badge>
        );
    };

    const renderTable = (variant: 'basic' | 'quick' | 'custom') => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {mockData.map((item, index) => (
                    <TableRow
                        key={item.id}
                        className={selectedItem === index ? 'bg-muted/50' : ''}
                    >
                        <TableCell>{item.name}</TableCell>
                        <TableCell><StatusBadge status={item.status} /></TableCell>
                        <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(item.updatedAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                            {variant === 'basic' && (
                                <EntityCommandGroup
                                    entityKey="test"
                                    data={item}
                                    index={index}
                                    commands={{
                                        view: true,
                                        edit: { useCallback: true },
                                        delete: { useCallback: true },
                                        archive: true,
                                        more: true
                                    }}
                                    onCommandExecute={handleCommandExecute}
                                    onSetActiveItem={setSelectedItem}
                                />
                            )}
                            {variant === 'quick' && (
                                <QuickEntityCommandGroup
                                    entityKey="test"
                                    data={item}
                                    index={index}
                                    show={['view', 'edit', 'delete', 'archive', 'more']}
                                    useCallbacks={['edit', 'delete']}
                                    onCommandExecute={handleCommandExecute}
                                    onSetActiveItem={setSelectedItem}
                                />
                            )}
                            {variant === 'custom' && (
                                <EntityCommandGroup
                                    entityKey="test"
                                    data={item}
                                    index={index}
                                    commands={{
                                        view: true,
                                        edit: { useCallback: true },
                                        delete: { useCallback: true, hidden: item.status === 'archived' },
                                        archive: { hidden: item.status === 'archived' },
                                        approve: { hidden: item.status !== 'inactive' },
                                    }}
                                    onCommandExecute={handleCommandExecute}
                                    onSetActiveItem={setSelectedItem}
                                />
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    return (
        <div className="container mx-auto py-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Entity Command Testing</CardTitle>
                    <CardDescription>
                        Test different configurations and variations of entity commands
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="basic">Basic Commands</TabsTrigger>
                            <TabsTrigger value="quick">Quick Commands</TabsTrigger>
                            <TabsTrigger value="custom">Custom Commands</TabsTrigger>
                        </TabsList>
                        <div className="mt-4">
                            <TabsContent value="basic">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Basic Command Configuration</CardTitle>
                                        <CardDescription>
                                            Standard entity commands with basic configuration
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-[500px]">
                                            {renderTable('basic')}
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="quick">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Quick Command Configuration</CardTitle>
                                        <CardDescription>
                                            Using QuickEntityCommandGroup for simplified setup
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-[500px]">
                                            {renderTable('quick')}
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="custom">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Custom Command Configuration</CardTitle>
                                        <CardDescription>
                                            Conditional visibility and custom command behavior
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-[500px]">
                                            {renderTable('custom')}
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
