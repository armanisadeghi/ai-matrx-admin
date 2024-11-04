// app/admin/command-test/page.tsx
'use client';

import React, {useEffect} from 'react';
import {useAppDispatch, useAppSelector} from '@/lib/redux/hooks';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {
    EntityCommandGroup,
    QuickEntityCommandGroup,
    createEntityCommand
} from '@/components/matrx/MatrxCommands/EntityCommand';
import {createEntitySelectors} from '@/lib/redux/entity/entitySelectors';
import {createEntityActions} from '@/lib/redux/entity/entityActionCreator';

// Global Commands Section - These will be shown at the top
const GlobalCommands: React.FC<{ entityKey: string }> = ({entityKey}) => {
    const dispatch = useAppDispatch();
    const selectors = createEntitySelectors(entityKey);
    const loading = useAppSelector(selectors.selectLoading);

    return (
        <div className="flex gap-2 mb-4">
            <QuickEntityCommandGroup
                entityKey={entityKey}
                data={null}
                index={-1}
                show={['create', 'refresh', 'import', 'export']}
                useCallbacks={['create', 'import']}
                className="space-x-2"
            />
        </div>
    );
};

// Standard Commands Test Section
const StandardCommandsTest: React.FC<{ entityKey: string }> = ({entityKey}) => {
    const dispatch = useAppDispatch();
    const selectors = createEntitySelectors(entityKey);
    const data = useAppSelector(selectors.selectData);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Standard Entity Commands</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item, index) => (
                            <TableRow key={item.id || index}>
                                <TableCell>{item.id}</TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>{item.status}</TableCell>
                                <TableCell className="text-right">
                                    <EntityCommandGroup
                                        entityKey={entityKey}
                                        data={item}
                                        index={index}
                                        commands={{
                                            view: true,
                                            edit: {useCallback: true},
                                            delete: {useCallback: true, requireConfirmation: true},
                                            archive: {useCallback: true},
                                            more: true
                                        }}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

// Quick Commands Test Section
const QuickCommandsTest: React.FC<{ entityKey: string }> = ({entityKey}) => {
    const selectors = createEntitySelectors(entityKey);
    const data = useAppSelector(selectors.selectData);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Quick Commands</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">Quick Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item, index) => (
                            <TableRow key={item.id || index}>
                                <TableCell>{item.id}</TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell className="text-right">
                                    <QuickEntityCommandGroup
                                        entityKey={entityKey}
                                        data={item}
                                        index={index}
                                        show={['edit', 'delete', 'archive', 'approve']}
                                        useCallbacks={['delete', 'archive']}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

// Conditional Commands Test Section
const ConditionalCommandsTest: React.FC<{ entityKey: string }> = ({entityKey}) => {
    const selectors = createEntitySelectors(entityKey);
    const data = useAppSelector(selectors.selectData);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Conditional Commands</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Conditional Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item, index) => (
                            <TableRow key={item.id || index}>
                                <TableCell>{item.id}</TableCell>
                                <TableCell>{item.status}</TableCell>
                                <TableCell className="text-right">
                                    <EntityCommandGroup
                                        entityKey={entityKey}
                                        data={item}
                                        index={index}
                                        commands={{
                                            approve: {hidden: item.status !== 'pending'},
                                            archive: {hidden: item.status === 'archived'},
                                            delete: {hidden: item.status === 'archived'},
                                            edit: {hidden: item.status === 'archived'}
                                        }}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

// Edit Mode Test Section
const EditModeTest: React.FC<{ entityKey: string }> = ({entityKey}) => {
    const selectors = createEntitySelectors(entityKey);
    const data = useAppSelector(selectors.selectData);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Edit Mode Commands</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">Edit Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item, index) => (
                            <TableRow key={item.id || index}>
                                <TableCell>{item.id}</TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell className="text-right">
                                    <EntityCommandGroup
                                        entityKey={entityKey}
                                        data={item}
                                        index={index}
                                        commands={{
                                            edit: true,
                                            save: {hidden: !item.isEditing},
                                            cancel: {hidden: !item.isEditing}
                                        }}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default function CommandTestPage() {
    const dispatch = useAppDispatch();
    const entityKey = 'test';
    const actions = createEntityActions(entityKey);

    useEffect(() => {
        // Initialize the test data
        dispatch(actions.fetchRequest());
    }, [dispatch, actions]);

    return (
        <div className="container mx-auto py-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Entity Command Testing Environment</CardTitle>
                </CardHeader>
                <CardContent>
                    <GlobalCommands entityKey={entityKey}/>

                    <Tabs defaultValue="standard" className="w-full">
                        <TabsList>
                            <TabsTrigger value="standard">Standard Commands</TabsTrigger>
                            <TabsTrigger value="quick">Quick Commands</TabsTrigger>
                            <TabsTrigger value="conditional">Conditional Commands</TabsTrigger>
                            <TabsTrigger value="edit">Edit Mode</TabsTrigger>
                        </TabsList>

                        <TabsContent value="standard">
                            <StandardCommandsTest entityKey={entityKey}/>
                        </TabsContent>

                        <TabsContent value="quick">
                            <QuickCommandsTest entityKey={entityKey}/>
                        </TabsContent>

                        <TabsContent value="conditional">
                            <ConditionalCommandsTest entityKey={entityKey}/>
                        </TabsContent>

                        <TabsContent value="edit">
                            <EditModeTest entityKey={entityKey}/>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
