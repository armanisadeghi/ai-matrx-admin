"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { QuickAppMakerOverlay } from "@/features/applet/builder/modules/app-builder/QuickAppMaker";
import AppSelectCreateOverlay from "@/features/applet/builder/modules/smart-parts/apps/AppSelectCreateOverlay";
import AppletSelectCreateOverlay from "@/features/applet/builder/modules/smart-parts/applets/AppletSelectCreateOverlay";
import { CustomAppConfig, CustomAppletConfig } from "@/types/customAppTypes";

export default function AppEditCreateTestPage() {
    const [showOverlay, setShowOverlay] = useState(false);
    const [testAppId, setTestAppId] = useState("");
    const [currentAppId, setCurrentAppId] = useState<string | undefined>(undefined);

    const handleTestCreate = () => {
        setCurrentAppId(undefined);
        setShowOverlay(true);
    };

    const handleTestEdit = () => {
        if (!testAppId.trim()) return;
        setCurrentAppId(testAppId.trim());
        setShowOverlay(true);
    };

    const handleQuickAppSaved = (appId: string) => {
        setShowOverlay(false);
    };

    const handleCancel = () => {
        setShowOverlay(false);
    };

    const handleAppSaved = (app: CustomAppConfig) => {
        console.log('App saved:', app);
    };

    const handleAppletSaved = (applet: CustomAppletConfig) => {
        console.log('Applet saved:', applet);
    };

    return (
        <div className="container mx-auto p-6 max-w-2xl space-y-6">
            <Card>
                <CardHeader>
                    <h2 className="text-lg font-semibold">Create Mode Test</h2>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleTestCreate} className="w-full">
                        Test Create New App
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <h2 className="text-lg font-semibold">Edit Mode Test</h2>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Input
                        placeholder="Enter App ID"
                        value={testAppId}
                        onChange={(e) => setTestAppId(e.target.value)}
                    />
                    <Button onClick={handleTestEdit} className="w-full">
                        Test Edit App
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <h2 className="text-lg font-semibold">Integrated App Select/Create</h2>
                </CardHeader>
                <CardContent>
                    <AppSelectCreateOverlay
                        onAppSaved={handleAppSaved}
                        buttonLabel="Open App Manager"
                        dialogTitle="Select or Create App"
                        showCreateOption={true}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <h2 className="text-lg font-semibold">App Manager with Delete</h2>
                </CardHeader>
                <CardContent>
                    <AppSelectCreateOverlay
                        onAppSaved={handleAppSaved}
                        buttonLabel="Open App Manager (with Delete)"
                        dialogTitle="Select, Create, or Delete App"
                        showCreateOption={true}
                        showDelete={true}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <h2 className="text-lg font-semibold">Applet Manager</h2>
                </CardHeader>
                <CardContent>
                    <AppletSelectCreateOverlay
                        onAppletSaved={handleAppletSaved}
                        buttonLabel="Open Applet Manager"
                        dialogTitle="Select or Create Applet"
                        showCreateOption={true}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <h2 className="text-lg font-semibold">Applet Manager with Delete</h2>
                </CardHeader>
                <CardContent>
                    <AppletSelectCreateOverlay
                        onAppletSaved={handleAppletSaved}
                        buttonLabel="Open Applet Manager (with Delete)"
                        dialogTitle="Select, Create, or Delete Applet"
                        showCreateOption={true}
                        showDelete={true}
                    />
                </CardContent>
            </Card>

            {showOverlay && (
                <QuickAppMakerOverlay
                    currentAppId={currentAppId}
                    onAppSaved={handleQuickAppSaved}
                    onCancel={handleCancel}
                />
            )}
        </div>
    );
}

