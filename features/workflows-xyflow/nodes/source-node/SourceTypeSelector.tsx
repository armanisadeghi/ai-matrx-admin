"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Database } from "lucide-react";
import { useAppSelector } from "@/lib/redux/hooks";
import { workflowsSelectors } from "@/lib/redux/workflow";
import UserInputNodeSettings from "./user-input/UserInputNodeSettings";
import UserDataSourceSettings from "./user-data/UserDataSourceSettings";

type SourceType = "user_input" | "user_data";

interface SourceTypeSelectorProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    workflowId: string;
    brokerId?: string;
    onSuccess?: () => void;
}

const SourceTypeSelector: React.FC<SourceTypeSelectorProps> = ({
    isOpen,
    onOpenChange,
    workflowId,
    brokerId,
    onSuccess,
}) => {
    const [selectedSourceType, setSelectedSourceType] = useState<SourceType | null>(null);

    // Check if we have an existing source in Redux
    const existingUserInputSource = useAppSelector((state) => 
        brokerId ? workflowsSelectors.userInputSourceByBrokerId(state, workflowId, brokerId) : null
    );
    
    const existingUserDataSource = useAppSelector((state) => 
        brokerId ? workflowsSelectors.userDataSourceByBrokerId(state, workflowId, brokerId) : null
    );

    // Determine source type from existing source
    useEffect(() => {
        if (brokerId) {
            if (existingUserInputSource) {
                setSelectedSourceType("user_input");
            } else if (existingUserDataSource) {
                setSelectedSourceType("user_data");
            }
            // If brokerId provided but no existing source, show selector for creating new
        }
    }, [brokerId, existingUserInputSource, existingUserDataSource]);

    const handleBack = () => {
        setSelectedSourceType(null);
    };

    const handleClose = (open: boolean) => {
        if (!open) {
            setSelectedSourceType(null);
        }
        onOpenChange(open);
    };

    const handleSuccess = () => {
        setSelectedSourceType(null);
        onSuccess?.();
    };

    // Render the selected source component
    if (selectedSourceType === "user_input") {
        return (
            <UserInputNodeSettings
                isOpen={isOpen}
                onOpenChange={handleClose}
                workflowId={workflowId}
                brokerId={brokerId}
                onSuccess={handleSuccess}
                onBack={!brokerId || !existingUserInputSource ? handleBack : undefined}
            />
        );
    }

    if (selectedSourceType === "user_data") {
        return (
            <UserDataSourceSettings
                isOpen={isOpen}
                onOpenChange={handleClose}
                workflowId={workflowId}
                brokerId={brokerId}
                onSuccess={handleSuccess}
                onBack={!brokerId || !existingUserDataSource ? handleBack : undefined}
            />
        );
    }

    // Show source type selection
    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Select Source Type</DialogTitle>
                    <DialogDescription className="sr-only">
                        Choose between user input source for collecting data from users or data source for referencing existing database tables.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <Card 
                        className="cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary/50"
                        onClick={() => setSelectedSourceType("user_input")}
                    >
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <CardTitle className="text-sm">User Input Source</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <CardDescription className="text-xs">
                                Create input fields that users can fill out when running the workflow. 
                                Ideal for collecting specific data like names, dates, or custom parameters.
                            </CardDescription>
                        </CardContent>
                    </Card>

                    <Card 
                        className="cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary/50"
                        onClick={() => setSelectedSourceType("user_data")}
                    >
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <Database className="h-5 w-5 text-green-600 dark:text-green-400" />
                                <CardTitle className="text-sm">Data Source</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <CardDescription className="text-xs">
                                Reference existing data tables from your database. 
                                Perfect for using stored customer data, product catalogs, or any structured data.
                            </CardDescription>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex justify-end pt-4">
                    <Button variant="outline" onClick={() => handleClose(false)}>
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SourceTypeSelector; 