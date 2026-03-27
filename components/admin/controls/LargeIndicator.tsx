// components/admin/controls/LargeIndicator.tsx
import React, { Suspense, lazy } from "react";
import { ChevronRight, X, Server, Activity, RefreshCw, AlertCircle, Check } from "lucide-react";
import MatrxDynamicPanel from "@/components/matrx/resizable/MatrxDynamicPanel";
import PageDebugDisplay from "@/components/admin/debug/PageDebugDisplay";
import { LazyEntityGate } from "@/providers/packs/LazyEntityGate";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectIsDebugMode, selectDebugData } from "@/lib/redux/slices/adminDebugSlice";
import { selectIsAdmin } from "@/lib/redux/slices/userSlice";
import {
    selectActiveServer,
    selectResolvedBaseUrl,
    selectActiveServerHealth,
    selectAllServerHealth,
    selectRecentApiCalls,
    checkServerHealth,
    switchServer,
    type ServerEnvironment,
} from "@/lib/redux/slices/apiConfigSlice";

const EnhancedEntityAnalyzer = lazy(() => import("@/components/admin/redux/EnhancedEntityAnalyzer"));

interface UserForIndicator {
    id: string;
    email?: string;
    name?: string;
    userMetadata?: { fullName: string };
    [key: string]: unknown;
}

interface LargeIndicatorProps {
    user: UserForIndicator;
    onSizeDown: () => void;
    onSizeSmall: () => void;
}

const statusColors: Record<string, string> = {
    healthy: "text-green-400",
    unhealthy: "text-red-400",
    checking: "text-yellow-400",
    unknown: "text-slate-400",
};

const statusBg: Record<string, string> = {
    healthy: "bg-green-500",
    unhealthy: "bg-red-500",
    checking: "bg-yellow-400 animate-pulse",
    unknown: "bg-gray-500",
};

const LargeIndicator: React.FC<LargeIndicatorProps> = ({ user, onSizeDown, onSizeSmall }) => {
    const dispatch = useAppDispatch();

    const isAdmin = useAppSelector(selectIsAdmin);
    const activeServer = useAppSelector(selectActiveServer);
    const resolvedUrl = useAppSelector(selectResolvedBaseUrl);
    const activeHealth = useAppSelector(selectActiveServerHealth);
    const allServerHealth = useAppSelector(selectAllServerHealth);
    const recentCalls = useAppSelector(selectRecentApiCalls);
    const isDebugMode = useAppSelector(selectIsDebugMode);
    const debugData = useAppSelector(selectDebugData);

    const lastCheckedLabel = activeHealth.lastCheckedAt
        ? `${Math.round((Date.now() - activeHealth.lastCheckedAt) / 1000)}s ago`
        : "never";

    const LargeControls = () => (
        <div className="bg-slate-800 text-white">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 bg-slate-900">
                <div className="font-semibold">Admin Dashboard</div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onSizeDown(); }}
                        className="p-1 rounded hover:bg-slate-700"
                    >
                        <ChevronRight size={16} className="rotate-180" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onSizeSmall(); }}
                        className="p-1 rounded hover:bg-slate-700"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* User + Active Server */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-700 p-3 rounded">
                        <div className="text-xs text-slate-400">Admin</div>
                        <div className="text-sm font-semibold text-blue-400 truncate" title={user.id}>
                            {user.userMetadata?.fullName || user.name || user.email || user.id}
                            {isAdmin && <span className="text-green-400 text-xs ml-1">(Admin)</span>}
                        </div>
                    </div>
                    <div className="bg-slate-700 p-3 rounded">
                        <div className="text-xs text-slate-400">Active Server</div>
                        <div className={`text-lg font-semibold ${statusColors[activeHealth.status] ?? statusColors.unknown}`}>
                            {activeServer}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                            {activeHealth.latencyMs != null ? `${activeHealth.latencyMs}ms` : "—"}
                            {" · "}
                            {lastCheckedLabel}
                        </div>
                    </div>
                </div>

                {/* Active URL */}
                <div className="bg-slate-700 p-3 rounded">
                    <div className="text-xs text-slate-400 flex items-center gap-2 mb-1">
                        <Server size={12} />
                        Active Endpoint
                        <button
                            onClick={() => dispatch(checkServerHealth({ force: true }))}
                            className="ml-auto p-0.5 rounded hover:bg-slate-600"
                            title="Re-check health"
                        >
                            <RefreshCw size={12} />
                        </button>
                    </div>
                    <div
                        className={`text-sm font-mono font-semibold break-all ${statusColors[activeHealth.status] ?? statusColors.unknown}`}
                        title={resolvedUrl}
                    >
                        {resolvedUrl ?? `${activeServer} — not configured`}
                    </div>
                    {activeHealth.error && activeHealth.status === "unhealthy" && (
                        <div className="flex items-center gap-1 text-xs text-red-400 mt-1">
                            <AlertCircle size={12} />
                            {activeHealth.error}
                        </div>
                    )}
                </div>

                {/* All Environments Health Grid */}
                <div className="bg-slate-700 p-3 rounded">
                    <div className="text-xs text-slate-400 mb-2">All Environments</div>
                    <div className="space-y-1.5">
                        {allServerHealth.map(({ env, resolvedUrl: envUrl, isConfigured, health, isActive }) => (
                            <div
                                key={env}
                                className={`flex items-center gap-2 text-xs cursor-pointer rounded px-1 py-0.5 hover:bg-slate-600/50 transition-colors ${
                                    isActive ? "bg-slate-600/40" : ""
                                }`}
                                onClick={() => (isConfigured || env === "custom") && dispatch(switchServer({ env: env as ServerEnvironment }))}
                                title={isConfigured ? envUrl ?? env : `${env} — env var not set`}
                            >
                                <span
                                    className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                                        isConfigured ? (statusBg[health.status] ?? statusBg.unknown) : "bg-slate-600"
                                    }`}
                                />
                                <span className={`w-24 shrink-0 ${isActive ? "text-green-400 font-semibold" : "text-white"}`}>
                                    {env}
                                </span>
                                {isActive && <Check size={10} className="text-green-400 shrink-0" />}
                                <span className={`truncate ${isConfigured ? "text-slate-300" : "text-slate-600"}`}>
                                    {isConfigured ? envUrl : "not configured"}
                                </span>
                                {isConfigured && health.latencyMs != null && (
                                    <span className="text-slate-500 shrink-0 ml-auto">{health.latencyMs}ms</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent API Calls */}
                <div className="bg-slate-700 p-3 rounded">
                    <div className="text-xs text-slate-400 flex items-center gap-2 mb-2">
                        <Activity size={12} />
                        Recent API Calls
                        <span className="ml-auto text-slate-500">{recentCalls.length} / 50</span>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                        {recentCalls.length === 0 ? (
                            <div className="text-slate-500 text-xs">No calls recorded yet</div>
                        ) : (
                            recentCalls.map((call) => (
                                <div
                                    key={call.id}
                                    className="flex items-center gap-2 text-[10px] font-mono py-0.5 border-b border-slate-600/50"
                                    title={`${call.method} ${call.baseUrl}${call.path}${call.httpStatus ? ` → ${call.httpStatus}` : ""}`}
                                >
                                    <span className={
                                        call.status === "success" ? "text-green-400 w-8 shrink-0" :
                                        call.status === "error" ? "text-red-400 w-8 shrink-0" :
                                        "text-yellow-400 w-8 shrink-0"
                                    }>
                                        {call.method}
                                    </span>
                                    <span className="text-slate-300 truncate flex-1">{call.path}</span>
                                    {call.httpStatus != null && (
                                        <span className={`shrink-0 ${call.httpStatus < 400 ? "text-green-400" : "text-red-400"}`}>
                                            {call.httpStatus}
                                        </span>
                                    )}
                                    {call.durationMs != null && (
                                        <span className="text-slate-500 shrink-0">{call.durationMs}ms</span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Debug Section */}
                {isDebugMode && (
                    <div className="mt-2">
                        {debugData && Object.keys(debugData).length > 0 ? (
                            <PageDebugDisplay debugData={debugData} />
                        ) : (
                            <LazyEntityGate label="LargeIndicator/EnhancedEntityAnalyzer">
                                <Suspense fallback={<div className="text-xs text-slate-400">Loading entity analyzer...</div>}>
                                    <EnhancedEntityAnalyzer defaultExpanded={false} selectedEntityKey="message" />
                                </Suspense>
                            </LazyEntityGate>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <MatrxDynamicPanel
            initialPosition="left"
            defaultExpanded={true}
            expandButtonProps={{ label: "" }}
        >
            <LargeControls />
        </MatrxDynamicPanel>
    );
};

export default LargeIndicator;
