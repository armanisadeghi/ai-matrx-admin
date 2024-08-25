// File Location: app/tests/crud-drawer/page.tsx

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FunctionEditDrawer from "@/features/registered-function/components/RegisteredFunctionDrawer";

const TestPage: React.FC = () => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingFunctionId, setEditingFunctionId] = useState<string | undefined>(undefined);
    const [inputFunctionId, setInputFunctionId] = useState('');

    const openDrawerForNew = () => {
        setEditingFunctionId(undefined);
        setIsDrawerOpen(true);
    };

    const openDrawerForEdit = () => {
        setEditingFunctionId(inputFunctionId);
        setIsDrawerOpen(true);
    };

    const handleDrawerOpenChange = (open: boolean) => {
        setIsDrawerOpen(open);
        if (!open) {
            setEditingFunctionId(undefined);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Function Edit Drawer Test</h1>
            <div className="space-y-4">
                <Button onClick={openDrawerForNew}>Create New Function</Button>
                <div className="flex space-x-2">
                    <Input
                        placeholder="Enter function ID"
                        value={inputFunctionId}
                        onChange={(e) => setInputFunctionId(e.target.value)}
                    />
                    <Button onClick={openDrawerForEdit}>Edit Existing Function</Button>
                </div>
            </div>

            <FunctionEditDrawer
                isOpen={isDrawerOpen}
                onOpenChange={handleDrawerOpenChange}
                functionId={editingFunctionId}
            />
        </div>
    );
};

export default TestPage;
