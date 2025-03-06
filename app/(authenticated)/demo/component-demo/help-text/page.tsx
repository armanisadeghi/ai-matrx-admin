'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {Input, Textarea } from "@heroui/react";
import {
    BaseHelpPanel,
    BaseHelpPanelSimple
} from "@/components/matrx/ArmaniForm/field-components/help-text/base-components";
import {helpContent} from "@/components/matrx/ArmaniForm/field-components/help-text/help-content";
import { HelpPanel } from '@/components/matrx/ArmaniForm/field-components/help-text/HelpPanel';
import { Button } from '@/components/ui';

export default function HelpPanelDemoPage() {
    const [settings, setSettings] = useState({
        position: 'inline',
        variant: 'default',
        showTitle: true,
        showSummary: true,
        draggable: false,
    });

    const updateSettings = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    // Demo content
    const mainContent = (
        <div className="space-y-4">
            <section>
                <h4 className="font-medium mb-2">Getting Started</h4>
                <p className="text-sm">
                    Welcome to our application! Here are some key features to help you get started:
                </p>
                <ul className="text-sm list-disc list-inside mt-2">
                    <li>Dashboard navigation</li>
                    <li>Data visualization tools</li>
                    <li>Report generation</li>
                </ul>
            </section>

            <section>
                <h4 className="font-medium mb-2">Tips & Tricks</h4>
                <p className="text-sm">
                    Use keyboard shortcuts to speed up your workflow. Press '?' anywhere to see all available shortcuts.
                </p>
            </section>
        </div>
    );

    const additionalSections = [
        <div key="advanced" className="text-sm space-y-2">
            <h4 className="font-medium">Advanced Features</h4>
            <p>Discover our power user features and advanced settings.</p>
        </div>,
        <div key="troubleshooting" className="text-sm space-y-2">
            <h4 className="font-medium">Troubleshooting</h4>
            <p>Common issues and their solutions.</p>
        </div>,
        <div key="updates" className="text-sm space-y-2">
            <h4 className="font-medium">Updates & Changes</h4>
            <p>Recent updates and upcoming features.</p>
        </div>
    ];

    const options = {
        position: [
            { value: 'inline', label: 'Inline' },
            { value: 'fixed', label: 'Fixed' }
        ],
        variant: [
            { value: 'default', label: 'Default' },
            { value: 'primary', label: 'Primary' },
            { value: 'success', label: 'Success' },
            { value: 'warning', label: 'Warning' }
        ]
    };

    const SettingsPanel = () => (
        <Card className="w-full lg:w-72">
            <CardHeader>
                <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="position-select">Position</Label>
                    <Select
                        value={settings.position}
                        onValueChange={(value) => updateSettings('position', value)}
                    >
                        <SelectTrigger id="position-select" className="w-full">
                            <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                            {options.position.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="variant-select">Variant</Label>
                    <Select
                        value={settings.variant}
                        onValueChange={(value) => updateSettings('variant', value)}
                    >
                        <SelectTrigger id="variant-select" className="w-full">
                            <SelectValue placeholder="Select variant" />
                        </SelectTrigger>
                        <SelectContent>
                            {options.variant.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Separator />

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="show-title" className="cursor-pointer">Show Title</Label>
                        <Switch
                            id="show-title"
                            checked={settings.showTitle}
                            onCheckedChange={(checked) => updateSettings('showTitle', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="show-summary" className="cursor-pointer">Show Summary</Label>
                        <Switch
                            id="show-summary"
                            checked={settings.showSummary}
                            onCheckedChange={(checked) => updateSettings('showSummary', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="draggable" className="cursor-pointer">Draggable</Label>
                        <Switch
                            id="draggable"
                            checked={settings.draggable}
                            onCheckedChange={(checked) => updateSettings('draggable', checked)}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="w-full min-h-screen">
            <div className="container mx-auto p-4 lg:p-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1">
                        <Card className="w-full">
                            <CardHeader>
                                <CardTitle>Help Panel Demos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="simple" className="w-full">
                                    <TabsList className="w-full">
                                        <TabsTrigger value="simple" className="flex-1">Simple Panel</TabsTrigger>
                                        <TabsTrigger value="expanded" className="flex-1">Expanded Panel</TabsTrigger>
                                        <TabsTrigger value="save-changes" className="flex-1">Save Modal</TabsTrigger>
                                        <TabsTrigger value="user-profile" className="flex-1">User Profile</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="simple" className="mt-6">
                                        <div className="p-6 border rounded-lg bg-card">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold mb-4">Simple Help Panel Example</h3>
                                                    <p className="text-muted-foreground mb-4">
                                                        This demonstrates the basic help panel with minimal configuration.
                                                    </p>
                                                    <Textarea
                                                        placeholder="Try typing here..."
                                                    />
                                                </div>
                                                <BaseHelpPanelSimple
                                                    title={settings.showTitle ? "Quick Help" : undefined}
                                                    summary={settings.showSummary ? "Basic information about this feature" : undefined}
                                                    variant={settings.variant}
                                                >
                                                    {mainContent}
                                                </BaseHelpPanelSimple>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="expanded" className="mt-6">
                                        <div className="p-6 border rounded-lg bg-card">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold mb-4">Expanded Help Panel Example</h3>
                                                    <p className="text-muted-foreground mb-4">
                                                        This demonstrates the expanded help panel with all available features.
                                                    </p>
                                                    <Textarea
                                                        placeholder="Try typing here..."
                                                    />
                                                </div>
                                                <BaseHelpPanel
                                                    position={settings.position}
                                                    variant={settings.variant}
                                                    title={settings.showTitle ? "Feature Guide" : undefined}
                                                    summary={settings.showSummary ? "Complete guide to using this feature" : undefined}
                                                    sections={additionalSections}
                                                    buttonLabels={["Advanced", "Troubleshooting", "Updates"]}
                                                    draggable={settings.draggable}
                                                >
                                                    {mainContent}
                                                </BaseHelpPanel>
                                            </div>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="save-changes" className="mt-6">
                                        <div className="p-6 border rounded-lg bg-card">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold mb-4">Save Changes Modal Example</h3>
                                                    <p className="text-muted-foreground mb-4">
                                                        This demonstrates using the help panel with predefined content in a modal context.
                                                    </p>
                                                    <Card className="p-4">
                                                        <h4 className="font-medium mb-4">Save Changes</h4>
                                                        <div className="space-y-4">
                                                            <div>
                                                                <Label>Document Name</Label>
                                                                <Input
                                                                    type="text"
                                                                    placeholder="Enter document name"
                                                                />
                                                            </div>
                                                            <div className="flex justify-end gap-2">
                                                                <Button variant="outline">Cancel</Button>
                                                                <Button>Save Changes</Button>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </div>
                                                <HelpPanel source="modal.save-changes" />
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="user-profile" className="mt-6">
                                        <div className="p-6 border rounded-lg bg-card">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold mb-4">User Profile Form Example</h3>
                                                    <p className="text-muted-foreground mb-4">
                                                        This demonstrates using the help panel with sections in a form context.
                                                    </p>
                                                    <Card className="p-4">
                                                        <h4 className="font-medium mb-4">Edit Profile</h4>
                                                        <div className="space-y-4">
                                                            <div>
                                                                <Label>Display Name</Label>
                                                                <Input
                                                                    type="text"
                                                                    placeholder="Enter your display name"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label>Email Preferences</Label>
                                                                <div className="space-y-2 mt-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <Switch id="marketing" />
                                                                        <Label htmlFor="marketing">Marketing emails</Label>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <Switch id="updates" />
                                                                        <Label htmlFor="updates">Product updates</Label>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </div>
                                                <HelpPanel source="form.user-profile" />
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    <SettingsPanel />

                </div>
            </div>
        </div>
    );
}


helpContent['modal.save-changes'] = {
    title: 'Saving Changes',
    summary: 'Learn about saving your changes',
    mainContent: (
        <div className="space-y-4">
            <section>
                <h4 className="font-medium mb-2">Save Options</h4>
                <p className="text-sm">
                    Review your changes before saving:
                </p>
                <ul className="text-sm list-disc list-inside mt-2">
                    <li>All fields are validated automatically</li>
                    <li>Required fields must be filled</li>
                    <li>Changes can't be undone after saving</li>
                </ul>
            </section>
        </div>
    ),
    variant: 'primary',
    position: 'fixed',
    draggable: true
};

// You can also organize help content by features/sections
helpContent['form.user-profile'] = {
    title: 'User Profile Help',
    summary: 'Guide to updating your profile',
    mainContent: (
        <div className="space-y-4">
            <section>
                <h4 className="font-medium mb-2">Profile Information</h4>
                <p className="text-sm">
                    Keep your profile information up to date.
                </p>
            </section>
        </div>
    ),
    sections: [
        {
            title: 'Privacy',
            content: (
                <div>Information about privacy settings and visibility options.</div>
            )
        },
        {
            title: 'Notifications',
            content: (
                <div>Configure how and when you receive notifications.</div>
            )
        }
    ],
    buttonLabels: ['Privacy', 'Notifications'],
    variant: 'default'
};
