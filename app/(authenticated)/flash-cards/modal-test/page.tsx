'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import AudioModal from '@/components/audio/AudioModal';
import QuickAudioHelp from '@/components/audio/QuickAudioHelp';
import { AUDIO_HELP_MESSAGES } from '@/constants/audioHelp';

export default function AudioModalDemo() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const sampleText = "This is a sample text that will be read aloud. It demonstrates the text-to-speech functionality of the AudioModal component. Feel free to modify this text to test different lengths and content.";

    // Group our messages by category for better organization
    const messageCategories = {
        general: ['help', 'errorHelp'],
        data: ['filterData', 'customizeTable', 'importData', 'exportData'],
        reports: ['newReport', 'searchTips', 'calculations'],
        settings: ['settings', 'userPreferences', 'notifications'],
        system: ['saveChanges', 'auditLog', 'workflow'],
    };

    const categoryTitles = {
        general: 'General Help',
        data: 'Data Management',
        reports: 'Reports & Analysis',
        settings: 'Settings & Preferences',
        system: 'System Features',
    };

    return (
        <div className="min-h-screen p-6 bg-background">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header section */}
                <div className="space-y-4">
                    <h1 className="text-4xl font-bold">Audio Help System Demo</h1>
                    <p className="text-lg text-muted-foreground">
                        Explore our collection of audio help messages designed to assist users throughout the application.
                    </p>
                </div>

                {/* Original demo section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Audio Modal</CardTitle>
                        <CardDescription>Simple demonstration of the base AudioModal component</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-4">
                        <Button onClick={() => setIsModalOpen(true)}>
                            Open Basic Modal
                        </Button>
                        <AudioModal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            text={sampleText}
                            title="Demo Audio"
                            description="Testing the AudioModal component"
                        />
                    </CardContent>
                </Card>

                {/* Quick Help Buttons Demo */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.entries(messageCategories).map(([category, messageIds]) => (
                        <Card key={category}>
                            <CardHeader>
                                <CardTitle>{categoryTitles[category]}</CardTitle>
                                <CardDescription>
                                    {messageIds.length} help messages available
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {messageIds.map((messageId) => {
                                        const message = AUDIO_HELP_MESSAGES[messageId];
                                        return (
                                            <div key={messageId} className="flex items-start gap-4">
                                                <QuickAudioHelp messageId={messageId} />
                                                <div className="flex-1">
                                                    <h3 className="font-medium">{message.title}</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {message.description}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Developer Usage Guide */}
                <Card>
                    <CardHeader>
                        <CardTitle>Developer Guide</CardTitle>
                        <CardDescription>How to implement these audio help buttons in your components</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Adding an audio help button to your component is as simple as importing and using the QuickAudioHelp component:
                        </p>
                        <pre className="p-4 rounded-lg bg-muted overflow-x-auto">
                                <code>{`import QuickAudioHelp from '@/components/audio/QuickAudioHelp';
    
                            // Then in your component:
                            <QuickAudioHelp messageId="help" />`}</code>
                                        </pre>
                        <p className="text-sm text-muted-foreground">
                            Available message IDs: {Object.keys(AUDIO_HELP_MESSAGES).join(', ')}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
