'use client';

import React from 'react';
import { EntityKeys } from '@/types/entityTypes';
import EntityAnalyzerView from '@/components/admin/redux/EntityAnalysisSummary';


const mockEntityState = {
    selection: {
        activeRecord: 'rec1',
        selectedRecords: ['rec1', 'rec2']
    },
    records: {
        rec1: {
            id: 'rec1',
            name: 'Test Record 1',
            email: 'test1@example.com',
            status: 'active',
            count: 42,
            lastUpdated: '2024-03-07T12:00:00Z'
        },
        rec2: {
            id: 'rec2',
            name: 'Test Record 2',
            email: 'test2@example.com',
            status: 'inactive',
            count: 17,
            lastUpdated: '2024-03-06T15:30:00Z'
        }
    },
    unsavedRecords: {
        rec1: {
            id: 'rec1',
            name: 'Test Record 1 (Modified)',
            email: 'test1.modified@example.com',
            status: 'pending',
            count: 43,
            lastUpdated: '2024-03-07T12:30:00Z'
        }
    },
    quickReference: {},
    flags: {
        operationMode: 'edit',
        hasUnsavedChanges: true
    },
    pendingOperations: [],
    loading: {
        loading: false,
        initialized: true,
        error: null,
        lastOperation: 'update'
    },
    entityMetadata: {
        fields: [
            { name: 'id', displayName: 'ID' },
            { name: 'name', displayName: 'Name' },
            { name: 'email', displayName: 'Email' },
            { name: 'status', displayName: 'Status' },
            { name: 'count', displayName: 'Count' },
            { name: 'lastUpdated', displayName: 'Last Updated' }
        ]
    }
};

// Mock the hook implementation
jest.mock('@/lib/redux/entity/hooks/useEntityAnalyzer', () => ({
    useEntityAnalyzer: () => ({
        rawEntityState: mockEntityState,
        getEntityLabel: (key: string) => `Test ${key}`
    })
}));

export default function TestPage() {
    return (
        <main className="flex min-h-0 flex-col">
            <EntityAnalyzerView entityKey="registeredFunction" />
        </main>
    );
}
