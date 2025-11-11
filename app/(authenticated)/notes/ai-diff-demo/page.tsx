// app/(authenticated)/notes/ai-diff-demo/page.tsx

'use client';

import React from 'react';
import { AITextEditor } from '@/features/notes/components/textDiff';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Sparkles } from 'lucide-react';

const DEMO_NOTE_ID = 'demo-note-ai-diff-system';

const DEMO_INITIAL_CONTENT = `Welcome to the AI Text Diff System Demo

This is a demonstration of the new AI-powered text editing system.

The system allows AI to suggest changes using diffs instead of rewriting entire documents.

How it works:
1. Click "AI Edit (Demo)" to simulate AI suggestions
2. Review the proposed changes in the right panel
3. Accept or reject individual changes, or accept all at once
4. Save your changes when ready
5. View version history by clicking "History"

Try editing this text and then click the AI Edit button to see the system in action!`;

export default function AIDiffDemoPage() {
    const [content, setContent] = React.useState(DEMO_INITIAL_CONTENT);

    return (
        <div className="container mx-auto py-8 space-y-6 max-w-7xl">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-4xl font-bold flex items-center gap-2">
                    <Sparkles className="h-8 w-8 text-primary" />
                    AI Text Diff System Demo
                </h1>
                <p className="text-lg text-muted-foreground">
                    Experience AI-powered text editing with visual diff review and version control
                </p>
            </div>

            {/* Instructions */}
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>How to Use This Demo</AlertTitle>
                <AlertDescription className="space-y-2">
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Edit the text in the editor on the left</li>
                        <li>Click <strong>"AI Edit (Demo)"</strong> to generate sample diffs</li>
                        <li>Review changes in the <strong>Diff Review Panel</strong> on the right</li>
                        <li>Accept/reject individual changes or click <strong>"Accept All"</strong></li>
                        <li>Save your changes when ready</li>
                        <li>Click <strong>"History"</strong> to view past versions</li>
                    </ol>
                </AlertDescription>
            </Alert>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Two Diff Formats</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CardDescription className="text-xs">
                            Support for search/replace and line-based replacement modes
                        </CardDescription>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Smart Matching</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CardDescription className="text-xs">
                            Exact match first, then fuzzy whitespace-tolerant matching
                        </CardDescription>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Version History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CardDescription className="text-xs">
                            Auto-versioning with database triggers (max 10 versions)
                        </CardDescription>
                    </CardContent>
                </Card>
            </div>

            {/* Main Editor */}
            <AITextEditor
                noteId={DEMO_NOTE_ID}
                initialContent={content}
                onContentChange={setContent}
                placeholder="Start typing to test the system..."
            />

            {/* Footer Info */}
            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle className="text-sm">System Information</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold mb-1">AI Diff Formats</h4>
                            <ul className="list-disc list-inside space-y-0.5">
                                <li><code className="text-xs">```diff</code> - Search and replace</li>
                                <li><code className="text-xs">```replace</code> - Line-based replacement</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-1">Features</h4>
                            <ul className="list-disc list-inside space-y-0.5">
                                <li>Redux state management</li>
                                <li>Database versioning</li>
                                <li>Accept/reject individual diffs</li>
                                <li>Auto-save on "Accept All"</li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-2 border-t">
                        <p>
                            <strong>Note:</strong> This is a demo. In production, the "AI Edit" button would call your actual AI service.
                            The demo generates mock diffs for demonstration purposes.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
