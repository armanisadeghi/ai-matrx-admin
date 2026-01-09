"use client";

import React, { useState } from "react";
import { Activity, Loader2, CheckCircle, AlertCircle, Server, Database, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBackendApi } from "@/hooks/useBackendApi";

interface HealthResponse {
    status?: string;
    message?: string;
    timestamp?: string;
    [key: string]: unknown;
}

interface DetailedHealthResponse extends HealthResponse {
    database?: {
        status: string;
        latency_ms?: number;
    };
    cache?: {
        status: string;
    };
    services?: {
        [key: string]: {
            status: string;
            [key: string]: unknown;
        };
    };
}

function HealthCard({ title, data, icon: Icon }: { title: string; data: any; icon: any }) {
    const isHealthy = data?.status === 'healthy' || data?.status === 'ok';
    
    return (
        <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
            <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-medium text-gray-500">{title}</span>
            </div>
            <p className={`text-sm font-medium ${
                isHealthy ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
                {data?.status || 'unknown'}
            </p>
            {data?.latency_ms && (
                <p className="text-xs text-gray-500 mt-1">
                    {data.latency_ms}ms latency
                </p>
            )}
        </div>
    );
}

export default function HealthDemoPage() {
    const api = useBackendApi();
    
    const [basicHealth, setBasicHealth] = useState<HealthResponse | null>(null);
    const [detailedHealth, setDetailedHealth] = useState<DetailedHealthResponse | null>(null);
    const [isLoadingBasic, setIsLoadingBasic] = useState(false);
    const [isLoadingDetailed, setIsLoadingDetailed] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const checkBasicHealth = async () => {
        setIsLoadingBasic(true);
        setError(null);
        setBasicHealth(null);

        try {
            const response = await api.get('/api/health');
            const data = await response.json();
            setBasicHealth(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Health check failed';
            setError(errorMessage);
        } finally {
            setIsLoadingBasic(false);
        }
    };

    const checkDetailedHealth = async () => {
        setIsLoadingDetailed(true);
        setError(null);
        setDetailedHealth(null);

        try {
            const response = await api.get('/api/health/detailed');
            const data = await response.json();
            setDetailedHealth(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Detailed health check failed';
            setError(errorMessage);
        } finally {
            setIsLoadingDetailed(false);
        }
    };

    return (
        <div className="min-h-screen bg-textured p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                        <Activity className="w-8 h-8" />
                        Health Check
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Monitor backend service health and status
                    </p>
                </div>

                {/* Actions */}
                <div className="bg-white dark:bg-zinc-900 border border-border rounded-lg p-6 mb-6">
                    <div className="flex gap-4">
                        <Button 
                            onClick={checkBasicHealth} 
                            disabled={isLoadingBasic}
                            variant="outline"
                            className="flex-1"
                        >
                            {isLoadingBasic ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                <>
                                    <Activity className="w-4 h-4 mr-2" />
                                    Basic Health
                                </>
                            )}
                        </Button>
                        <Button 
                            onClick={checkDetailedHealth} 
                            disabled={isLoadingDetailed}
                            className="flex-1"
                        >
                            {isLoadingDetailed ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4 mr-2" />
                                    Detailed Health
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">Health Check Failed</h4>
                            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                        </div>
                    </div>
                )}

                {/* Basic Health Response */}
                {basicHealth && (
                    <div className="bg-white dark:bg-zinc-900 border border-border rounded-lg overflow-hidden mb-6">
                        <div className="border-b border-border px-6 py-3 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-gray-500" />
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Basic Health</h3>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center justify-center mb-6">
                                <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                                    <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                                    {basicHealth.status || 'Healthy'}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {basicHealth.message || 'Service is operational'}
                                </p>
                            </div>
                            {basicHealth.timestamp && (
                                <p className="text-xs text-gray-500 text-center">
                                    Checked at: {new Date(basicHealth.timestamp).toLocaleString()}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Detailed Health Response */}
                {detailedHealth && (
                    <div className="bg-white dark:bg-zinc-900 border border-border rounded-lg overflow-hidden">
                        <div className="border-b border-border px-6 py-3 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-gray-500" />
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Detailed Health</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Overall Status */}
                            <div className="text-center pb-6 border-b border-border">
                                <div className="inline-flex items-center justify-center p-3 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                                </div>
                                <h2 className="text-xl font-bold text-green-600 dark:text-green-400">
                                    {detailedHealth.status || 'Healthy'}
                                </h2>
                            </div>

                            {/* Service Components */}
                            <div className="grid grid-cols-2 gap-4">
                                {detailedHealth.database && (
                                    <HealthCard title="Database" data={detailedHealth.database} icon={Database} />
                                )}
                                {detailedHealth.cache && (
                                    <HealthCard title="Cache" data={detailedHealth.cache} icon={Zap} />
                                )}
                                {detailedHealth.services && Object.entries(detailedHealth.services).map(([name, data]) => (
                                    <HealthCard key={name} title={name} data={data} icon={Server} />
                                ))}
                            </div>

                            {/* Timestamp */}
                            {detailedHealth.timestamp && (
                                <p className="text-xs text-gray-500 text-center pt-4 border-t border-border">
                                    Last checked: {new Date(detailedHealth.timestamp).toLocaleString()}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
