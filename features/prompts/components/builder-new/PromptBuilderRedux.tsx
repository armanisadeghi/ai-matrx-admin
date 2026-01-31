
"use client";

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import {
    initializePromptEditor,
    savePrompt,
    selectPromptName,
    selectPromptStatus,
    setName,
    selectPromptId
} from '@/lib/redux/slices/promptEditorSlice';
import { fetchAvailableModels } from '@/lib/redux/slices/modelRegistrySlice';
import { PromptSettingsPanel } from './PromptSettingsPanel';
import { PromptMessageList } from './PromptMessageList';
import { PromptVariableManager } from './PromptVariableManager';
import { PromptTestPanel } from './PromptTestPanel';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

interface PromptBuilderReduxProps {
    promptId?: string;
}

export const PromptBuilderRedux: React.FC<PromptBuilderReduxProps> = ({ promptId }) => {
    const dispatch = useAppDispatch();
    const name = useAppSelector(selectPromptName);
    const status = useAppSelector(selectPromptStatus);
    const id = useAppSelector(selectPromptId);

    const [activeTab, setActiveTab] = useState("settings");

    useEffect(() => {
        dispatch(fetchAvailableModels());
        dispatch(initializePromptEditor(promptId));
    }, [dispatch, promptId]);

    const handleSave = async () => {
        try {
            await dispatch(savePrompt()).unwrap();
            toast.success("Prompt saved successfully");
        } catch (error) {
            toast.error("Failed to save prompt");
        }
    };

    if (status.isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (status.error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen space-y-4">
                <div className="text-destructive font-medium">Error loading prompt</div>
                <div className="text-muted-foreground">{status.error}</div>
                <Link href="/ai/prompts">
                    <Button variant="outline">Back to Prompts</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-page bg-textured text-foreground overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-2 border-b bg-card">
                <div className="flex items-center space-x-4">
                    <Link href="/ai/prompts">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="flex items-center space-x-2">
                        <Input
                            value={name}
                            onChange={(e) => dispatch(setName(e.target.value))}
                            className="h-8 w-64 font-medium"
                            placeholder="Prompt Name"
                        />
                        {status.isDirty && (
                            <span className="text-xs text-muted-foreground italic">Unsaved changes</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        onClick={handleSave}
                        disabled={status.isSaving || !status.isDirty}
                        size="sm"
                    >
                        {status.isSaving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Save
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                <ResizablePanelGroup orientation="horizontal">
                    {/* Left Panel: Settings & Variables */}
                    <ResizablePanel defaultSize={20} minSize={10} maxSize={30} className="border-r">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                            <div className="px-2 py-2 border-b">
                                <TabsList className="w-full grid grid-cols-2">
                                    <TabsTrigger value="settings">Settings</TabsTrigger>
                                    <TabsTrigger value="variables">Variables</TabsTrigger>
                                </TabsList>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <TabsContent value="settings" className="h-full m-0 border-0">
                                    <PromptSettingsPanel />
                                </TabsContent>
                                <TabsContent value="variables" className="h-full m-0 border-0">
                                    <PromptVariableManager />
                                </TabsContent>
                            </div>
                        </Tabs>
                    </ResizablePanel>

                    <ResizableHandle />

                    {/* Center Panel: Message Editor */}
                    <ResizablePanel defaultSize={45} minSize={10}>
                        <div className="h-full p-4 bg-muted/10">
                            <PromptMessageList />
                        </div>
                    </ResizablePanel>

                    <ResizableHandle />

                    {/* Right Panel: Test/Chat */}
                    <ResizablePanel defaultSize={35} minSize={10} className="border-l">
                        <PromptTestPanel />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
            <Toaster />
        </div>
    );
};
