'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Logo } from '@/public/MatrixLogo';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    ShieldCheck,
    Mail,
    User,
    Phone,
    ExternalLink,
    AlertTriangle,
    Loader2,
    CheckCircle,
    XCircle,
    ArrowRight,
    ShieldAlert,
} from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OAuthClient {
    id: string;
    name: string;
    uri: string;
    logo_uri: string;
}

interface OAuthAuthorizationDetails {
    authorization_id: string;
    redirect_url?: string;
    client: OAuthClient;
    user: {
        id: string;
        email: string;
    };
    scope: string;
}

interface ScopeDisplayInfo {
    label: string;
    description: string;
    icon: typeof ShieldCheck;
}

interface ErrorDetail {
    code?: string;
    status?: number;
    origin?: string;
}

type PageState =
    | { kind: 'loading' }
    | { kind: 'error'; title: string; message: string; retryable: boolean; detail?: ErrorDetail }
    | { kind: 'redirecting'; message: string }
    | { kind: 'consent'; details: OAuthAuthorizationDetails; user: SupabaseUser };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCOPE_DISPLAY: Record<string, ScopeDisplayInfo> = {
    openid: {
        label: 'Verify your identity',
        description: 'Confirm that you are who you say you are',
        icon: ShieldCheck,
    },
    email: {
        label: 'Email address',
        description: 'View your email address',
        icon: Mail,
    },
    profile: {
        label: 'Profile information',
        description: 'View your name and profile picture',
        icon: User,
    },
    phone: {
        label: 'Phone number',
        description: 'View your phone number',
        icon: Phone,
    },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseScopes(scopeString: string): string[] {
    return scopeString
        .trim()
        .split(/\s+/)
        .filter((s) => s.length > 0);
}

function getInitials(email: string): string {
    const name = email.split('@')[0];
    return name.slice(0, 2).toUpperCase();
}

function getDomain(uri: string): string {
    try {
        return new URL(uri).hostname;
    } catch {
        return uri;
    }
}

/** Map Supabase Auth error responses to user-friendly error states */
function mapAuthError(
    error: { message?: string; status?: number; code?: string; [key: string]: unknown },
    context: string,
): { title: string; message: string; retryable: boolean; detail: ErrorDetail } {
    const code = (error.code as string) ?? '';
    const msg = (error.message as string) ?? '';
    const status = (error.status as number) ?? 0;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    const detail: ErrorDetail = { code: code || msg, status, origin };

    // Origin mismatch — the page domain doesn't match the Supabase Site URL
    if (msg.includes('unauthorized request origin') || code === 'validation_failed') {
        return {
            title: 'Origin not authorized',
            message:
                `This page is being served from "${origin}" but the OAuth server ` +
                'expects a different domain. This is a configuration issue — please ' +
                'contact the AI Matrx team.',
            retryable: false,
            detail,
        };
    }

    // Expired or already-used authorization
    if (msg.includes('expired') || msg.includes('not found') || status === 404) {
        return {
            title: 'Request expired',
            message:
                'This authorization request has expired or was already used. ' +
                'Please return to the application and try again.',
            retryable: false,
            detail,
        };
    }

    // Rate limited
    if (status === 429) {
        return {
            title: 'Too many requests',
            message: 'Please wait a moment and try again.',
            retryable: true,
            detail,
        };
    }

    // Generic fallback
    return {
        title: `Authorization error (${status || 'unknown'})`,
        message:
            `${context}: ${msg || 'An unexpected error occurred'}. ` +
            'Please return to the application and try again.',
        retryable: status >= 500,
        detail,
    };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConsentClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [pageState, setPageState] = useState<PageState>({ kind: 'loading' });
    const [actionLoading, setActionLoading] = useState<'approve' | 'deny' | null>(null);

    const authorizationId = searchParams.get('authorization_id');

    // -----------------------------------------------------------------------
    // Initialize — check user session, then fetch authorization details
    // -----------------------------------------------------------------------
    useEffect(() => {
        async function initialize() {
            console.log('[OAuth Consent] Starting initialization...');
            console.log('[OAuth Consent] authorization_id:', authorizationId);

            if (!authorizationId || typeof authorizationId !== 'string') {
                console.log('[OAuth Consent] ERROR: Missing or invalid authorization_id');
                setPageState({
                    kind: 'error',
                    title: 'Invalid request',
                    message:
                        'This authorization request is missing required information. Please return to the application and try again.',
                    retryable: false,
                });
                return;
            }

            const supabase = createClient();

            // Step 1: Check if user is authenticated (required before fetching details)
            console.log('[OAuth Consent] Step 1: Checking user authentication...');
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            console.log('[OAuth Consent] User:', user?.email ?? 'NOT LOGGED IN');
            console.log('[OAuth Consent] User error:', userError?.message ?? 'none');

            if (userError || !user) {
                const currentUrl = window.location.pathname + window.location.search;
                console.log('[OAuth Consent] Redirecting to login with redirectTo:', currentUrl);
                router.push(`/login?redirectTo=${encodeURIComponent(currentUrl)}`);
                return;
            }

            // Step 2: Get authorization details (requires authenticated session)
            console.log('[OAuth Consent] Step 2: Fetching authorization details...');
            console.log('[OAuth Consent] Current origin:', window.location.origin);
            const { data: authData, error: authError } =
                await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

            if (authError) {
                const errObj = authError as unknown as Record<string, unknown>;
                console.error('[OAuth Consent] getAuthorizationDetails FAILED:', {
                    message: authError.message,
                    status: authError.status,
                    code: errObj.code,
                    origin: window.location.origin,
                    authorization_id: authorizationId,
                });
            } else {
                console.log('[OAuth Consent] Auth data received:', authData ? 'yes' : 'null');
            }

            if (authError || !authData) {
                const mapped = mapAuthError(
                    authError as unknown as Record<string, unknown>,
                    'Failed to load authorization details',
                );
                setPageState({ kind: 'error', ...mapped });
                return;
            }

            // Step 3: Check for immediate redirect (already consented)
            if (authData.redirect_url) {
                console.log('[OAuth Consent] Step 3: Already consented, redirecting to:', authData.redirect_url);
                setPageState({
                    kind: 'redirecting',
                    message: 'You have already authorized this application. Redirecting...',
                });
                window.location.href = authData.redirect_url;
                return;
            }

            // Step 4: Show consent screen
            console.log('[OAuth Consent] Step 4: Showing consent screen');
            console.log('[OAuth Consent] Client:', authData.client?.name);
            console.log('[OAuth Consent] Scopes:', authData.scope);
            setPageState({
                kind: 'consent',
                details: authData,
                user,
            });
        }

        initialize();
    }, [authorizationId, router]);

    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------
    async function handleApprove() {
        if (!authorizationId || actionLoading) return;
        setActionLoading('approve');

        try {
            const supabase = createClient();
            const { data, error } = await supabase.auth.oauth.approveAuthorization(authorizationId);

            if (error || !data) {
                console.error('[OAuth Consent] approveAuthorization FAILED:', {
                    message: error?.message,
                    status: error?.status,
                    code: (error as unknown as Record<string, unknown>)?.code,
                });
                setActionLoading(null);
                const mapped = mapAuthError(
                    (error ?? { message: 'No data returned' }) as unknown as Record<string, unknown>,
                    'Failed to approve authorization',
                );
                setPageState({ kind: 'error', ...mapped, retryable: true });
                return;
            }

            setPageState({
                kind: 'redirecting',
                message: 'Authorization granted. Redirecting...',
            });
            window.location.href = data.redirect_url;
        } catch (err) {
            console.error('[OAuth Consent] approveAuthorization threw:', err);
            setActionLoading(null);
            setPageState({
                kind: 'error',
                title: 'Network error',
                message:
                    'Unable to reach the server. Please check your connection and try again.',
                retryable: true,
                detail: { code: String(err) },
            });
        }
    }

    async function handleDeny() {
        if (!authorizationId || actionLoading) return;
        setActionLoading('deny');

        try {
            const supabase = createClient();
            const { data, error } = await supabase.auth.oauth.denyAuthorization(authorizationId);

            if (error || !data) {
                console.error('[OAuth Consent] denyAuthorization FAILED:', {
                    message: error?.message,
                    status: error?.status,
                    code: (error as unknown as Record<string, unknown>)?.code,
                });
                setActionLoading(null);
                const mapped = mapAuthError(
                    (error ?? { message: 'No data returned' }) as unknown as Record<string, unknown>,
                    'Failed to deny authorization',
                );
                setPageState({ kind: 'error', ...mapped, retryable: true });
                return;
            }

            setPageState({
                kind: 'redirecting',
                message: 'Authorization denied. Redirecting...',
            });
            window.location.href = data.redirect_url;
        } catch (err) {
            console.error('[OAuth Consent] denyAuthorization threw:', err);
            setActionLoading(null);
            setPageState({
                kind: 'error',
                title: 'Network error',
                message:
                    'Unable to reach the server. Please check your connection and try again.',
                retryable: true,
                detail: { code: String(err) },
            });
        }
    }

    function handleRetry() {
        setPageState({ kind: 'loading' });
        window.location.reload();
    }

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
        <div className="min-h-dvh w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-neutral-950 dark:to-neutral-900 p-4">
            <div className="w-full max-w-md">
                {/* AI Matrx branding */}
                <div className="flex justify-center mb-6">
                    <Logo size="lg" variant="horizontal" linkEnabled={false} />
                </div>

                {/* Main card */}
                <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg dark:shadow-neutral-950/50 overflow-hidden border border-gray-200/60 dark:border-neutral-700/60">
                    {pageState.kind === 'loading' && <LoadingState />}
                    {pageState.kind === 'error' && (
                        <ErrorState
                            title={pageState.title}
                            message={pageState.message}
                            retryable={pageState.retryable}
                            detail={pageState.detail}
                            onRetry={handleRetry}
                        />
                    )}
                    {pageState.kind === 'redirecting' && (
                        <RedirectingState message={pageState.message} />
                    )}
                    {pageState.kind === 'consent' && (
                        <ConsentForm
                            details={pageState.details}
                            user={pageState.user}
                            actionLoading={actionLoading}
                            onApprove={handleApprove}
                            onDeny={handleDeny}
                        />
                    )}
                </div>

                {/* Footer */}
                <p className="mt-4 text-center text-xs text-gray-400 dark:text-neutral-500">
                    AI Matrx keeps your data secure.{' '}
                    <a
                        href="/privacy-policy"
                        className="underline underline-offset-2 hover:text-gray-500 dark:hover:text-neutral-400 transition-colors"
                    >
                        Privacy Policy
                    </a>
                </p>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingState() {
    return (
        <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                </div>
            </div>
            <Skeleton className="h-px w-full" />
            <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
            </div>
            <div className="flex gap-3 pt-2">
                <Skeleton className="h-10 flex-1 rounded-md" />
                <Skeleton className="h-10 flex-1 rounded-md" />
            </div>
        </div>
    );
}

function ErrorState({
    title,
    message,
    retryable,
    detail,
    onRetry,
}: {
    title: string;
    message: string;
    retryable: boolean;
    detail?: ErrorDetail;
    onRetry: () => void;
}) {
    return (
        <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-1.5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
                <p className="text-sm text-gray-500 dark:text-neutral-400">{message}</p>
            </div>
            {detail && (
                <div className="text-left rounded-lg bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 px-3 py-2.5 mt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500 mb-1.5">
                        Debug Info
                    </p>
                    <div className="space-y-0.5 text-xs font-mono text-gray-500 dark:text-neutral-400">
                        {detail.code && <p>Error: {detail.code}</p>}
                        {detail.status ? <p>Status: {detail.status}</p> : null}
                        {detail.origin && <p>Origin: {detail.origin}</p>}
                    </div>
                </div>
            )}
            {retryable && (
                <Button onClick={onRetry} variant="outline" className="mt-2">
                    Try again
                </Button>
            )}
        </div>
    );
}

function RedirectingState({ message }: { message: string }) {
    return (
        <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Loader2 className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            <div className="space-y-1.5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Redirecting</h2>
                <p className="text-sm text-gray-500 dark:text-neutral-400">{message}</p>
            </div>
        </div>
    );
}

function ConsentForm({
    details,
    user,
    actionLoading,
    onApprove,
    onDeny,
}: {
    details: OAuthAuthorizationDetails;
    user: SupabaseUser;
    actionLoading: 'approve' | 'deny' | null;
    onApprove: () => void;
    onDeny: () => void;
}) {
    const scopes = parseScopes(details.scope);
    const clientDomain = getDomain(details.client.uri);
    const userEmail = user.email ?? details.user.email;
    const userAvatar = user.user_metadata?.avatar_url as string | undefined;
    const userName = (user.user_metadata?.full_name ?? user.user_metadata?.name) as
        | string
        | undefined;

    return (
        <div className="p-6 sm:p-8">
            {/* Requesting app header */}
            <div className="text-center space-y-3 mb-6">
                {details.client.logo_uri ? (
                    <img
                        src={details.client.logo_uri}
                        alt={`${details.client.name} logo`}
                        className="h-12 w-12 rounded-xl mx-auto object-contain"
                    />
                ) : (
                    <div className="h-12 w-12 rounded-xl mx-auto bg-gray-100 dark:bg-neutral-700 flex items-center justify-center">
                        <ExternalLink className="h-6 w-6 text-gray-400 dark:text-neutral-500" />
                    </div>
                )}
                <div>
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {details.client.name}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-neutral-400">
                        wants to access your AI Matrx account
                    </p>
                </div>
            </div>

            {/* Unverified / dynamic client warning */}
            {!details.client.logo_uri && (
                <div className="flex items-start gap-2.5 mb-5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/70 dark:border-amber-700/40 px-3.5 py-2.5">
                    <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                        This application has not been verified by AI Matrx. Only authorize it if you
                        trust <span className="font-medium">{clientDomain}</span>.
                    </p>
                </div>
            )}

            {/* Signed-in user identity */}
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-neutral-750 border border-gray-100 dark:border-neutral-700 px-3.5 py-3 mb-5">
                <Avatar className="h-9 w-9">
                    {userAvatar && <AvatarImage src={userAvatar} alt={userName ?? userEmail} />}
                    <AvatarFallback className="text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {getInitials(userEmail)}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    {userName && (
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {userName}
                        </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">
                        {userEmail}
                    </p>
                </div>
            </div>

            {/* Not you? link */}
            <div className="text-right -mt-3 mb-4">
                <a
                    href={`/login?redirectTo=${encodeURIComponent(`/oauth/consent?authorization_id=${details.authorization_id}`)}`}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline underline-offset-2"
                >
                    Not you? Use a different account
                </a>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-200 dark:bg-neutral-700 mb-5" />

            {/* Scopes / permissions */}
            <div className="mb-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500 mb-3">
                    This will allow {details.client.name} to:
                </h2>
                <ul className="space-y-2">
                    {scopes.map((scope) => {
                        const info = SCOPE_DISPLAY[scope];
                        if (!info) return null;
                        const IconComp = info.icon;
                        return (
                            <li
                                key={scope}
                                className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-neutral-700 bg-gray-50/50 dark:bg-neutral-750/50 px-3.5 py-3"
                            >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-900/30">
                                    <IconComp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {info.label}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
                                        {info.description}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* Redirect URI */}
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500 mb-5">
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                    Redirecting to{' '}
                    <span className="font-medium text-gray-500 dark:text-neutral-400">
                        {clientDomain}
                    </span>
                </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3">
                <Button
                    variant="outline"
                    className="flex-1"
                    onClick={onDeny}
                    disabled={actionLoading !== null}
                >
                    {actionLoading === 'deny' ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Denying...
                        </>
                    ) : (
                        <>
                            <XCircle className="h-4 w-4" />
                            Deny
                        </>
                    )}
                </Button>
                <Button
                    className="flex-1"
                    onClick={onApprove}
                    disabled={actionLoading !== null}
                >
                    {actionLoading === 'approve' ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Authorizing...
                        </>
                    ) : (
                        <>
                            <CheckCircle className="h-4 w-4" />
                            Authorize
                        </>
                    )}
                </Button>
            </div>

            {/* Privacy note */}
            <p className="mt-4 text-center text-xs text-gray-400 dark:text-neutral-500 leading-relaxed">
                You can revoke access at any time from your{' '}
                <a
                    href="/settings"
                    className="underline underline-offset-2 hover:text-gray-500 dark:hover:text-neutral-400 transition-colors"
                >
                    AI Matrx settings
                </a>
                .
            </p>
        </div>
    );
}
