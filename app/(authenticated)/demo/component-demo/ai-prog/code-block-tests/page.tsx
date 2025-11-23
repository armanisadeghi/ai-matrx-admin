'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CodeBlock from '@/features/code-editor/components/code-block/CodeBlock';
import MultiFileCodeEditor, { type CodeFile as MultiCodeFile } from '@/features/code-editor/components/code-block/MultiFileCodeEditor';
import { CODE_FILES, type CodeFile } from './constants';

export default function CodeBlockTestPage() {
    const [selectedFile, setSelectedFile] = useState<CodeFile>('types');
    const [files, setFiles] = useState(CODE_FILES);
    const [multiFiles, setMultiFiles] = useState<MultiCodeFile[]>([]);

    // Initialize multi-file editor files
    useMemo(() => {
        const initialFiles: MultiCodeFile[] = Object.entries(CODE_FILES).map(([key, data]) => ({
            name: data.label,
            path: `/${data.label}`,
            language: data.language,
            content: data.code,
            readOnly: false,
        }));
        setMultiFiles(initialFiles);
    }, []);

    const handleCodeChange = (fileKey: CodeFile) => (newCode: string) => {
        console.log(`File ${fileKey} updated`);
        setFiles(prev => ({
            ...prev,
            [fileKey]: {
                ...prev[fileKey],
                code: newCode,
            },
        }));
    };

    const handleMultiFileChange = (path: string, content: string) => {
        console.log(`Multi-file ${path} updated`);
        setMultiFiles(prev =>
            prev.map(f => f.path === path ? { ...f, content } : f)
        );
    };

    const selectedFileData = files[selectedFile];

    return (
        <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden pb-safe">
            <div className="flex-shrink-0 px-6 py-4 border-b bg-card">
                <h1 className="text-2xl font-bold">Code Editor Test Suite</h1>
            </div>

            <Tabs defaultValue="multi" className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-shrink-0 px-6 pt-4">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="multi">Multi-File Editor</TabsTrigger>
                        <TabsTrigger value="single">Single File Editor</TabsTrigger>
                    </TabsList>
                </div>

                {/* Single File Editor Test */}
                <TabsContent value="single" className="flex-1 flex flex-col overflow-hidden px-6 py-4 space-y-4 m-0">
                    <Card className="flex-shrink-0">
                        <CardContent className="space-y-3 pb-4">
                            <Label>File</Label>
                            <Select value={selectedFile} onValueChange={(v) => setSelectedFile(v as CodeFile)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(CODE_FILES).map(([key, { label }]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                    <Card className="flex-1 flex flex-col overflow-hidden">
                        <CardContent className="pt-4 pb-4 flex-1 flex flex-col overflow-hidden">
                            <div className="text-xs text-muted-foreground mb-2 flex-shrink-0">
                                {selectedFileData.label} | {selectedFileData.language}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <CodeBlock
                                    code={selectedFileData.code}
                                    language={selectedFileData.language}
                                    showLineNumbers={true}
                                    onCodeChange={handleCodeChange(selectedFile)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Multi-File Editor Test */}
                <TabsContent value="multi" className="flex-1 flex flex-col overflow-hidden px-6 py-4 m-0">
                    <Card className="flex-1 flex flex-col overflow-hidden">
                        <CardContent className="pb-4 flex-1 flex flex-col overflow-hidden">
                            {multiFiles.length > 0 && (
                                <div className="flex-1 overflow-hidden">
                                    <MultiFileCodeEditor
                                        files={multiFiles}
                                        onChange={handleMultiFileChange}
                                        onFileSelect={(path) => console.log('Selected file:', path)}
                                        autoFormatOnOpen={false}
                                        defaultWordWrap="off"
                                        showSidebar={true}
                                        height="100%"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
