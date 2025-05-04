"use client";

import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectAppById, selectAppLoading, selectHasUnsavedAppChanges } from "@/lib/redux/app-builder/selectors/appSelectors";
import { setActiveAppWithFetchThunk } from "@/lib/redux/app-builder/thunks/appBuilderThunks";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import AppEditor from '@/features/applet/builder/modules/app-builder/AppEditor';

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
    const isLoading = useAppSelector(selectAppLoading);
    const hasUnsavedChanges = useAppSelector(selectHasUnsavedAppChanges);

    // Set the active app when the component loads
    useEffect(() => {
        if (id) {
            dispatch(setActiveAppWithFetchThunk(id));
        }

        // Clean up when unmounting
        return () => {
            // Optional: reset active app when navigating away
            // dispatch(setActiveApp(null));
        };
    }, [id, dispatch]);

    // Handle save success - navigate to the app view
    const handleSaveSuccess = (appId: string) => {
        router.push(`/apps/app-builder/apps/${appId}`);
        toast({
            title: "Success",
            description: "App saved successfully",
        });
    };

    // Handle cancel - go back to apps list or view
    const handleCancel = () => {
        if (hasUnsavedChanges) {
            if (confirm("You have unsaved changes. Are you sure you want to leave?")) {
                router.push(`/apps/app-builder/apps/${id}`);
            }
        } else {
            router.push(`/apps/app-builder/apps/${id}`);
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

    return (
        <div className="space-y-6">
            <AppEditor appId={id} isCreatingNew={false} onSaveSuccess={handleSaveSuccess} onCancel={handleCancel} />
            <Toaster />
        </div>
    );
}
