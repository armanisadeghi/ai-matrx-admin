"use client";

import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectAppById, selectAppLoading, selectAppName, selectHasUnsavedAppChanges } from "@/lib/redux/app-builder/selectors/appSelectors";
import { setActiveAppWithFetchThunk, saveAppThunk } from "@/lib/redux/app-builder/thunks/appBuilderThunks";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Info, Code, Users, Layout, History } from 'lucide-react';

// Tab Components
import EditTabLayout from './components/EditTabLayout';
import OverviewEditTab from './components/OverviewEditTab';
import JsonConfigEditTab from './components/JsonConfigEditTab';
import AppletsEditTab from './components/AppletsEditTab';
import AppLayoutEditTab from './components/AppLayoutEditTab';
import LegacyEditorTab from './components/LegacyEditorTab';

interface AppEditPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default function AppEditPage({ params }: AppEditPageProps) {
    // Use React.use() to unwrap the params Promise
    const resolvedParams = React.use(params);
    const { id } = resolvedParams;
    
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { toast } = useToast();

    // Get the app data from Redux
    const app = useAppSelector((state) => selectAppById(state, id));
    const appName = useAppSelector((state) => selectAppName(state, id));
    const isLoading = useAppSelector(selectAppLoading);
    const hasUnsavedChanges = useAppSelector(selectHasUnsavedAppChanges);

    // Set the active app when the component loads
    useEffect(() => {
        if (id) {
            dispatch(setActiveAppWithFetchThunk(id));
        }
    }, [id, dispatch]);

    // Handle save
    const handleSave = async () => {
        if (!id) return;
        
        try {
            await dispatch(saveAppThunk(id)).unwrap();
            return Promise.resolve();
        } catch (error: any) {
            console.error("Failed to save app:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to save app",
                variant: "destructive",
            });
            return Promise.reject(error);
        }
    };

    // Loading state
    if (isLoading || !app) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const tabs = [
        {
            id: 'overview',
            label: 'Overview',
            icon: <Info className="h-4 w-4" />,
            content: <OverviewEditTab appId={id} />,
        },
        {
            id: 'applets',
            label: 'Applets',
            icon: <Users className="h-4 w-4" />,
            content: <AppletsEditTab appId={id} />,
        },
        {
            id: 'layout',
            label: 'Layout',
            icon: <Layout className="h-4 w-4" />,
            content: <AppLayoutEditTab appId={id} />,
        },
        {
            id: 'json',
            label: 'JSON Config',
            icon: <Code className="h-4 w-4" />,
            content: <JsonConfigEditTab appId={id} />,
        },
        {
            id: 'legacy',
            label: 'Legacy Editor',
            icon: <History className="h-4 w-4" />,
            content: <LegacyEditorTab appId={id} />,
        },
    ];

    return (
        <div className="space-y-6">
            <EditTabLayout
                title={appName || 'Untitled App'}
                subtitle={`ID: ${id}`}
                tabs={tabs}
                id={id}
                onSave={handleSave}
                hasChanges={hasUnsavedChanges}
            />
            <Toaster />
        </div>
    );
}
