"use client";

import React, { useState, useEffect } from "react";
import { Mic, Loader2, CheckCircle, Clock, Server, Wifi, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoPageLayout } from "../_components/DemoPageLayout";
import { ResponseViewer } from "../_components/ResponseViewer";
import { usePublicScraperStream } from "@/features/scraper/hooks/usePublicScraperStream";

interface MicCheckResponse {
    status?: string;
    message?: string;
    timestamp?: string;
    service?: string;
    sample_data?: unknown;
    [key: string]: unknown;
}

// Rendered content component for mic check
function RenderedContent({ data }: { data: MicCheckResponse }) {
    const isSuccess = data?.status === 'success' || data?.status === 'ok';
    
    return (
        <div className="p-6">
            <div className="max-w-xl mx-auto">
                {/* Status Badge */}
                <div className="flex items-center justify-center mb-8">
                    <div className={`p-4 rounded-full ${
                        isSuccess 
                            ? 'bg-green-100 dark:bg-green-900/30' 
                            : 'bg-amber-100 dark:bg-amber-900/30'
                    }`}>
                        {isSuccess ? (
                            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                        ) : (
                            <AlertCircle className="w-12 h-12 text-amber-600 dark:text-amber-400" />
                        )}
                    </div>
                </div>

                {/* Status Text */}
                <div className="text-center mb-8">
                    <h2 className={`text-2xl font-bold mb-2 ${
                        isSuccess ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                        {isSuccess ? 'Connection Successful!' : 'Response Received'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        {data.message || 'The scraper service is responding'}
                    </p>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Server className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-medium text-gray-500">Service</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {data.service || 'Scraper API'}
                        </p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-medium text-gray-500">Timestamp</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {data.timestamp || new Date().toISOString()}
                        </p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Wifi className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-medium text-gray-500">Status</span>
                        </div>
                        <p className={`text-sm font-medium ${
                            isSuccess ? 'text-green-600' : 'text-amber-600'
                        }`}>
                            {data.status || 'unknown'}
                        </p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Mic className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-medium text-gray-500">Response</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {Object.keys(data).length} properties
                        </p>
                    </div>
                </div>

                {/* Sample Data Preview */}
                {data.sample_data && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                            Sample Data Included
                        </h3>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                            The response includes sample data. Check the Explorer tab to inspect it.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MicCheckDemoPage() {
    const [latency, setLatency] = useState<number | null>(null);
    const [micCheckData, setMicCheckData] = useState<MicCheckResponse | null>(null);

    const {
        isLoading,
        error,
        micCheck,
    } = usePublicScraperStream({
        onData: (data) => {
            console.log('[Mic Check] Data received:', data);
            setMicCheckData(data as MicCheckResponse);
        },
        onError: (err) => {
            console.error('[Mic Check] Error:', err);
        },
    });

    const handleMicCheck = async () => {
        setLatency(null);
        setMicCheckData(null);
        
        const startTime = performance.now();
        await micCheck();
        const endTime = performance.now();
        setLatency(Math.round(endTime - startTime));
    };

    const inputSection = (
        <div className="flex gap-4 items-center">
            <Button 
                onClick={handleMicCheck} 
                disabled={isLoading}
                size="lg"
                className="px-8"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                    </>
                ) : (
                    <>
                        <Mic className="w-4 h-4 mr-2" />
                        Run Mic Check
                    </>
                )}
            </Button>
            
            {latency !== null && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{latency}ms response time</span>
                </div>
            )}

            <div className="flex-1 text-right text-xs text-gray-400">
                Endpoint: POST /api/scraper/mic-check
            </div>
        </div>
    );

    return (
        <DemoPageLayout
            title="Mic Check"
            description="Test the scraper API connection and view sample response (with auth headers)"
            inputSection={inputSection}
        >
            <ResponseViewer
                data={micCheckData}
                isLoading={isLoading}
                error={error}
                title="Mic Check Response"
                renderContent={(data) => <RenderedContent data={data as MicCheckResponse} />}
            />
        </DemoPageLayout>
    );
}
