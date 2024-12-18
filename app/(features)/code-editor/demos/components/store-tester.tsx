// components/store-tester.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EditorFile } from '../../types';
import EditorStore from '../../utils/store';
import { FileDropzone } from './file-dropzone';


export function StoreTester() {
    const [files, setFiles] = useState<EditorFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<EditorFile | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const store = EditorStore.getInstance();

    useEffect(() => {
        loadFiles();
    }, []);

    const loadFiles = async () => {
        const { data, error } = await store.getAllFiles();
        if (error) {
            setError(error.message);
            return;
        }
        setFiles(data || []);
    };

    const handleFileDrop = async (file: File) => {
        try {
            const content = await file.text();
            const newFile = {
                path: file.name,
                content,
                lastModified: file.lastModified
            };

            const { error } = await store.saveFile(newFile);
            if (error) throw error;

            setSuccess(`File ${file.name} saved successfully`);
            loadFiles();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleManualSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newFile = {
            path: formData.get('path') as string,
            content: formData.get('content') as string,
            lastModified: Date.now()
        };

        try {
            const { error } = await store.saveFile(newFile);
            if (error) throw error;

            setSuccess(`File ${newFile.path} saved successfully`);
            loadFiles();
            e.currentTarget.reset();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleFileSelect = async (id: string) => {
        const { data, error } = await store.getFile(id);
        if (error) {
            setError(error.message);
            return;
        }
        setSelectedFile(data || null);
    };

    const handleFileDelete = async (id: string) => {
        try {
            const { error } = await store.deleteItem(store.getStoreName(), id);
            if (error) throw error;

            setSuccess('File deleted successfully');
            if (selectedFile?.id === id) {
                setSelectedFile(null);
            }
            loadFiles();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="container mx-auto p-4 space-y-4">
            <h1 className="text-2xl font-bold mb-4">IndexedDB Store Tester</h1>

            {/* Status Messages */}
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {success && (
                <Alert className="mb-4">
                    <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* File Upload Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Add New File</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FileDropzone onFileDrop={handleFileDrop} />

                        <div className="divider">OR</div>

                        <form onSubmit={handleManualSave} className="space-y-4">
                            <Input
                                name="path"
                                placeholder="File path/name"
                                required
                            />
                            <Textarea
                                name="content"
                                placeholder="File content"
                                required
                                rows={5}
                            />
                            <Button type="submit">Save File</Button>
                        </form>
                    </CardContent>
                </Card>

                {/* File List Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Stored Files</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px] w-full">
                            <div className="space-y-2">
                                {files.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex items-center justify-between p-2 border rounded hover:bg-gray-100"
                                    >
                                        <span className="truncate flex-1">{file.path}</span>
                                        <div className="space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleFileSelect(file.id)}
                                            >
                                                View
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleFileDelete(file.id)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* File Preview Section */}
                {selectedFile && (
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>File Preview: {selectedFile.path}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div>
                                    <strong>ID:</strong> {selectedFile.id}
                                </div>
                                <div>
                                    <strong>Last Modified:</strong>{' '}
                                    {new Date(selectedFile.lastModified).toLocaleString()}
                                </div>
                                <div>
                                    <strong>Content:</strong>
                                    <pre className="mt-2 p-4 bg-gray-100 rounded overflow-auto">
                                        {selectedFile.content}
                                    </pre>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default StoreTester;