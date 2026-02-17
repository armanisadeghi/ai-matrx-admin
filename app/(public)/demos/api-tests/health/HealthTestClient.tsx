"use client";

import React, { useState } from "react";
import { Activity, Loader2, CheckCircle, AlertCircle, Server, Database, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiTestConfig, ApiTestConfigPanel } from "@/components/api-test-config";
import { TEST_ADMIN_TOKEN } from "../sample-prompt";

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
        <div className="p-4 bg-muted rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{title}</span>
            </div>
            <p className={`text-sm font-medium ${
                isHealthy ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
                {data?.status || 'unknown'}
            </p>
            {data?.latency_ms && (
                <p className="text-xs text-muted-foreground mt-1">
                    {data.latency_ms}ms latency
                </p>
            )}
        </div>
    );
}

export default function HealthTestClient() {
    const apiConfig = useApiTestConfig({
        defaultServerType: 'local',
        defaultAuthToken: TEST_ADMIN_TOKEN,
    });
    
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
            const response = await fetch(`${apiConfig.baseUrl}/api/health`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiConfig.authToken}`,
                },
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
            const response = await fetch(`${apiConfig.baseUrl}/api/health/detailed`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiConfig.authToken}`,
                },
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
        <div className="h-full flex flex-col overflow-hidden bg-background">
            {/* Fixed header section */}
            <div className="flex-shrink-0 p-3 space-y-2">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    <h1 className="text-lg font-bold">Health Check</h1>
                </div>

                {/* API Configuration */}
                <ApiTestConfigPanel config={apiConfig} />
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3">
                <div className="max-w-4xl space-y-4">
                    {/* Actions */}
                    <div className="bg-card border border-border rounded-lg p-4">
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
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-destructive mb-1">Health Check Failed</h4>
                                <p className="text-sm text-destructive/80">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Basic Health Response */}
                    {basicHealth && (
                        <div className="bg-card border border-border rounded-lg overflow-hidden">
                            <div className="border-b border-border px-6 py-3 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-muted-foreground" />
                                <h3 className="font-semibold">Basic Health</h3>
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
                                    <p className="text-muted-foreground">
                                        {basicHealth.message || 'Service is operational'}
                                    </p>
                                </div>
                                {basicHealth.timestamp && (
                                    <p className="text-xs text-muted-foreground text-center">
                                        Checked at: {new Date(basicHealth.timestamp).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Detailed Health Response */}
                    {detailedHealth && (
                        <div className="bg-card border border-border rounded-lg overflow-hidden">
                            <div className="border-b border-border px-6 py-3 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-muted-foreground" />
                                <h3 className="font-semibold">Detailed Health</h3>
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
                                    <p className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
                                        Last checked: {new Date(detailedHealth.timestamp).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
