// app/admin/command-test/page.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createEntitySelectors } from '@/lib/redux/entity/entitySelectors';
import { createEntityActions } from '@/lib/redux/entity/entityActionCreator';
import { EntityCommandContext, EntityCommandName } from "@/components/matrx/MatrxCommands/EntityCommand";
import { useToast } from '@/components/ui/use-toast';
import MatrxTable from '@/components/matrx/EntityTable/MatrxServerTable';
import {
    selectEntityPrimaryKeyField,
    selectEntityDisplayField,
    selectEntityPrettyName,
    selectAllFieldPrettyNames
} from '@/lib/redux/schema/globalCacheSelectors';

// Test configurations for different command scenarios
const createTestConfigs = (entityKey: string) => ({
    standard: {
        view: true,
        edit: { useCallback: true, setActiveOnClick: true },
        delete: { useCallback: true, requireConfirmation: true },
        archive: true,
        more: true
    },
    quick: {
        edit: true,
        delete: { useCallback: true },
        archive: { useCallback: true }
    },
    editMode: {
        edit: true,
        save: { hidden: false },
        cancel: { hidden: false }
    }
});

const CommandTestSection: React.FC<{
    entityKey: string;
    configType: 'standard' | 'quick' | 'editMode';
    title: string;
    description?: string;
}> = ({ entityKey, configType, title, description }) => {
    const dispatch = useAppDispatch();
    const { toast } = useToast();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const entitySelectors = createEntitySelectors(entityKey);
    const entityActions = createEntityActions(entityKey);

    // Selectors
    const data = useAppSelector(entitySelectors.selectData);
    const loading = useAppSelector(entitySelectors.selectLoading);
    const error = useAppSelector(entitySelectors.selectError);
    const totalCount = useAppSelector(entitySelectors.selectTotalCount);

    const primaryKeyField = useAppSelector((state) =>
        selectEntityPrimaryKeyField(state, entityKey)
    );
    const fieldPrettyNames = useAppSelector((state) =>
        selectAllFieldPrettyNames(state, { entityName: entityKey })
    );

    const handleCommandExecute = async (
        actionName: EntityCommandName,
        context: EntityCommandContext<typeof entityKey>
    ) => {
        try {
            switch (actionName) {
                case 'view':
                    dispatch(entityActions.setSelectedItem({ index: context.index }));
                    break;
                case 'edit':
                    dispatch(entityActions.setSelectedItem({ index: context.index }));
                    // Create backup before editing
                    dispatch({
                        type: `entities/${entityKey}/createBackup`,
                        payload: { index: context.index }
                    });
                    break;
                case 'delete':
                    await dispatch(entityActions.deleteRequest(context.index));
                    toast({
                        title: 'Success',
                        description: 'Item deleted successfully'
                    });
                    break;
                default:
                    console.log(`Executing ${actionName}:`, context);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to execute ${actionName}: ${(error as Error).message}`,
                variant: 'destructive'
            });
        }
    };

    const testConfigs = createTestConfigs(entityKey);
    const commands = testConfigs[configType];

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description && <AlertDescription>{description}</AlertDescription>}
            </CardHeader>
            <CardContent>
                <MatrxTable
                    entityKey={entityKey}
                    data={data}
                    primaryKey={primaryKeyField}
                    commands={commands}
                    onCommandExecute={handleCommandExecute}
                    columnHeaders={fieldPrettyNames}
                    truncateAt={50}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    isServerSide={true}
                    loading={loading}
                    totalCount={totalCount}
                    serverPage={page}
                    serverPageSize={pageSize}
                />
            </CardContent>
        </Card>
    );
};

export default function CommandTestPage() {
    const entityKey = 'registeredFunction'; // Replace with your actual test entity key
    const [activeTab, setActiveTab] = useState('standard');
    const entityPrettyName = useAppSelector((state) =>
        selectEntityPrettyName(state, entityKey)
    );

    return (
        <div className="container mx-auto py-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Command Testing: {entityPrettyName}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="standard">Standard Commands</TabsTrigger>
                            <TabsTrigger value="quick">Quick Commands</TabsTrigger>
                            <TabsTrigger value="editMode">Edit Mode</TabsTrigger>
                        </TabsList>

                        <TabsContent value="standard">
                            <CommandTestSection
                                entityKey={entityKey}
                                configType="standard"
                                title="Standard Command Configuration"
                                description="Testing basic entity operations with full command set"
                            />
                        </TabsContent>

                        <TabsContent value="quick">
                            <CommandTestSection
                                entityKey={entityKey}
                                configType="quick"
                                title="Quick Command Configuration"
                                description="Testing simplified command setup with QuickEntityCommandGroup"
                            />
                        </TabsContent>

                        <TabsContent value="editMode">
                            <CommandTestSection
                                entityKey={entityKey}
                                configType="editMode"
                                title="Edit Mode Configuration"
                                description="Testing edit mode state handling and related commands"
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
