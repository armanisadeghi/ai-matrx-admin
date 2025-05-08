"use client";

import React, { useEffect } from "react";
import { Cpu } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import AppletTabsWrapper from "@/features/applet/builder/parts/AppletTabsWrapper";
import ContainerTabContent from "@/features/applet/builder/modules/group-builder/ContainerTabContent";
import { selectContainerError } from "@/lib/redux/app-builder/selectors/containerSelectors";

interface GroupsConfigStepProps {
    appId: string;
    onUpdateCompletion?: (completion: {
        isComplete: boolean;
        canProceed: boolean;
        message?: string;
        footerButtons?: React.ReactNode;
    }) => void;
}

export const GroupsConfigStep: React.FC<GroupsConfigStepProps> = ({ appId, onUpdateCompletion }) => {
    const { toast } = useToast();
    const dispatch = useAppDispatch();
    const containerError = useAppSelector(selectContainerError);

    // Show error toasts when they occur
    useEffect(() => {
        if (containerError) {
            toast({
                title: "Error",
                description: containerError as string,
                variant: "destructive",
            });
        }
    }, [containerError, toast]);

    return (
        <AppletTabsWrapper 
            appId={appId} 
            title="Field Container Configuration" 
            description="Containers group similar fields together"
            emptyStateTitle="No Applets Available"
            emptyStateDescription="No applets have been created yet. Please go back and add applets first."
            emptyStateIcon={Cpu}
        >
            {(applet) => (
                <ContainerTabContent 
                    appletId={applet.id} 
                    appId={appId}
                    onUpdateCompletion={onUpdateCompletion} 
                />
            )}
        </AppletTabsWrapper>
    );
};

export default GroupsConfigStep;
