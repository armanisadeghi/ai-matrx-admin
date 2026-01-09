"use client";

import React, { useState, useRef } from "react";
import { Upload, Loader2, FileText, X, CheckCircle, AlertCircle, Server, Clock, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBackendApi } from "@/hooks/useBackendApi";

interface PdfExtractResponse {
    filename?: string;
    text_content?: string;
    [key: string]: unknown;
}

export default function PdfExtractDemoPage() {
    const api = useBackendApi();
    
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [extractedData, setExtractedData] = useState<PdfExtractResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [requestTime, setRequestTime] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const isValid = file.type === 'application/pdf' || file.type.startsWith('image/');
            if (!isValid) {
                setError(`Invalid file type: ${file.type}`);
                return;
            }
            setSelectedFile(file);
            setExtractedData(null);
            setError(null);
            setRequestTime(null);
        }
    };

    const handleExtract = async () => {
        if (!selectedFile) return;

        const startTime = performance.now();
        setIsLoading(true);
        setError(null);
        setExtractedData(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const response = await api.upload('/api/pdf/extract-text', formData);
            const data = await response.json();
            
            setExtractedData(data);
            setRequestTime(performance.now() - startTime);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Extraction failed';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const textContent = extractedData?.text_content || '';
    const charCount = textContent.length;
    const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;

    return (
        <div className="h-full flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
            {/* Compact Header */}
            <div className="flex-shrink-0 border-b border-border bg-white dark:bg-zinc-900 px-4 py-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-500" />
                        <div>
                            <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">PDF Extract API</h1>
                            <p className="text-xs text-gray-500">POST /api/pdf/extract-text</p>
                        </div>
                    </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                        {requestTime && (
                            <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{requestTime.toFixed(0)}ms</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <Server className="w-3 h-3" />
                            <span>{api.backendUrl.includes('localhost') ? 'localhost:8000' : 'production'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-4 space-y-3">
                    {/* Input */}
                    <div className="bg-white dark:bg-zinc-900 border border-border rounded p-3">
                        <div className="flex gap-2 items-end">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,image/*"
                                onChange={handleFileSelect}
                                disabled={isLoading}
                                className="hidden"
                            />
                            <div className="flex-1">
                                {selectedFile ? (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-zinc-800 rounded border border-border">
                                        <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                        <span className="text-sm truncate flex-1">{selectedFile.name}</span>
                                        <span className="text-xs text-gray-500">
                                            {(selectedFile.size / 1024).toFixed(1)} KB
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 flex-shrink-0"
                                            onClick={() => {
                                                setSelectedFile(null);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                            disabled={isLoading}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isLoading}
                                        size="sm"
                                        className="w-full"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Select PDF/Image
                                    </Button>
                                )}
                            </div>
                            <Button 
                                onClick={handleExtract} 
                                disabled={!selectedFile || isLoading}
                                size="sm"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Extracting
                                    </>
                                ) : (
                                    'Extract'
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded text-sm">
                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <span className="text-red-700 dark:text-red-300">{error}</span>
                        </div>
                    )}

                    {/* Stats */}
                    {extractedData && (
                        <div className="grid grid-cols-4 gap-2">
                            <div className="bg-white dark:bg-zinc-900 border border-border rounded p-2">
                                <div className="flex items-center gap-1 mb-1">
                                    <CheckCircle className="w-3 h-3 text-green-600" />
                                    <span className="text-xs text-gray-500">Status</span>
                                </div>
                                <p className="text-sm font-medium text-green-600">Success</p>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 border border-border rounded p-2">
                                <div className="flex items-center gap-1 mb-1">
                                    <FileText className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs text-gray-500">File</span>
                                </div>
                                <p className="text-sm font-medium truncate">{extractedData.filename}</p>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 border border-border rounded p-2">
                                <div className="flex items-center gap-1 mb-1">
                                    <Hash className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs text-gray-500">Characters</span>
                                </div>
                                <p className="text-sm font-medium">{charCount.toLocaleString()}</p>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 border border-border rounded p-2">
                                <div className="flex items-center gap-1 mb-1">
                                    <Hash className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs text-gray-500">Words</span>
                                </div>
                                <p className="text-sm font-medium">{wordCount.toLocaleString()}</p>
                            </div>
                        </div>
                    )}

                    {/* Extracted Text */}
                    {extractedData && textContent && (
                        <div className="bg-white dark:bg-zinc-900 border border-border rounded overflow-hidden">
                            <div className="border-b border-border px-3 py-2">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Extracted Text</span>
                            </div>
                            <div className="p-3">
                                <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
{textContent}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* Loading */}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-zinc-900 border border-border rounded">
                            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-2" />
                            <p className="text-sm text-gray-500">Processing document...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
