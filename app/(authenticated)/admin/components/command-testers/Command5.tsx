/*
// app/admin/command-test/page.tsx
'use client';

import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createEntitySelectors } from '@/lib/redux/entity/selectors';
import { createEntityActions } from '@/lib/redux/entity/actions';
import {createEntityCommand} from "@/components/matrx/MatrxCommands/EntityCommand";

const EntitySelectorTest = () => {
    const [entityName, setEntityName] = useState('');
    const dispatch = useAppDispatch();

    // Create a custom fetch command
    const FetchCommand = createEntityCommand({
        name: 'fetch',
        entityKey: entityName,
        type: 'feature',
        scope: 'custom',
        icon: <RefreshCw className="h-4 w-4"/>,
        component: Button,
        className: "bg-primary text-primary-foreground hover:bg-primary/90",

        onExecuteEntity: async (context) => {
            dispatch(context.selectors.actions.fetchPaginatedRequest({
                page: 1,
                pageSize: 10
            }));
        }
    });

    return (
        <div className="flex items-end gap-4">
            <div className="flex-1">
                <Label>Entity Name</Label>
                <Input
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    placeholder="Enter entity name"
                />
            </div>
            <FetchCommand data={null} index={-1} />
        </div>
    );
};

const SingleItemTest = () => {
    const [entityKey, setEntityKey] = useState('users');
    const selectors = createEntitySelectors(entityKey);
    const data = useAppSelector(selectors.selectData);
    const firstItem = data?.[0];

    // Demonstrate individual command buttons
    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <EntityCommandGroup
                    entityKey={entityKey}
                    data={firstItem}
                    index={0}
                    commands={{
                        view: true,
                        edit: { useCallback: true },
                        delete: { useCallback: true }
                    }}
                />
            </div>
            <div className="text-sm text-muted-foreground">
                These buttons are wired to work with the first item in the {entityKey} table
            </div>
        </div>
    );
};

const BatchOperationsTest = () => {
    const [entityKey, setEntityKey] = useState('products');

    // Create a custom batch command
    const BatchApproveCommand = createEntityCommand({
        name: 'batchApprove',
        entityKey,
        type: 'feature',
        scope: 'batch',
        icon: <CheckCircle className="h-4 w-4"/>,
        component: Button,
        className: "bg-success text-success-foreground hover:bg-success/90",

        onExecuteEntity: async (context) => {
            // Demo of batch operation
            dispatch({
                type: `entities/${entityKey}/batchApprove`,
                payload: { status: 'approved' }
            });
        }
    });

    return (
        <div className="space-y-4">
            <BatchApproveCommand data={null} index={-1} />
            <div className="text-sm text-muted-foreground">
                This button triggers a batch operation on {entityKey}
            </div>
        </div>
    );
};

const CustomActionsTest = () => {
    const [entityKey] = useState('orders');

    // Create a custom workflow command
    const ProcessOrderCommand = createEntityCommand({
        name: 'processOrder',
        entityKey,
        type: 'workflow',
        scope: 'single',
        icon: <Package className="h-4 w-4"/>,
        component: Button,
        className: "bg-warning text-warning-foreground hover:bg-warning/90",

        onExecuteEntity: async (context) => {
            // Demo of multi-step workflow
            await dispatch({
                type: `entities/${entityKey}/startProcessing`,
                payload: { orderId: context.data.id }
            });
            // Could trigger more actions in sequence
        }
    });

    return (
        <div className="space-y-4">
            <ProcessOrderCommand
                data={{ id: '123', status: 'pending' }}
                index={0}
            />
            <div className="text-sm text-muted-foreground">
                Custom workflow command for order processing
            </div>
        </div>
    );
};

export default function CommandTestPage5() {
    return (
        <div className="container mx-auto py-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Smart Command Components Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Entity Selector with Fetch</h3>
                        <EntitySelectorTest />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Single Item Operations</h3>
                        <SingleItemTest />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Batch Operations</h3>
                        <BatchOperationsTest />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Custom Workflow Actions</h3>
                        <CustomActionsTest />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
*/
