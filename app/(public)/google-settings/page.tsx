"use client";

import { useGoogleAPI } from "@/providers/google-provider/GoogleApiProvider";
import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const SCOPE_OPTIONS = [
    { 
        id: 'webmasters', 
        label: 'Search Console', 
        scope: 'https://www.googleapis.com/auth/webmasters', 
        description: 'View and manage Search Console data for your verified sites.' 
    },
    { 
        id: 'calendar.app', 
        label: 'App-Created Calendars', 
        scope: 'https://www.googleapis.com/auth/calendar.app.created', 
        description: 'Create and manage secondary Google calendars.' 
    },
    { 
        id: 'drive.file', 
        label: 'Specific Drive Files', 
        scope: 'https://www.googleapis.com/auth/drive.file', 
        description: 'See, edit, create, and delete only the specific Google Drive files you use with this app.' 
    },
    { 
        id: 'calendar.all', 
        label: 'Full Calendar Access', 
        scope: 'https://www.googleapis.com/auth/calendar', 
        description: 'See, edit, share, and permanently delete all your calendars.' 
    },
    { 
        id: 'slides', 
        label: 'Google Slides', 
        scope: 'https://www.googleapis.com/auth/presentations', 
        description: 'See, edit, create, and delete all your Google Slides presentations.' 
    },
    { 
        id: 'tasks', 
        label: 'Google Tasks', 
        scope: 'https://www.googleapis.com/auth/tasks', 
        description: 'Create, edit, organize, and delete all your tasks.' 
    }
];

export default function GoogleSettingsPage() {
    const { 
        signIn, 
        signOut, 
        isAuthenticated, 
        isGoogleLoaded, 
        isInitializing, 
        error, 
        getGrantedScopes,
        token 
    } = useGoogleAPI();

    const [grantedScopes, setGrantedScopes] = useState<string[]>([]);
    const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
    const [requestError, setRequestError] = useState<string | null>(null);

    useEffect(() => {
        if(isAuthenticated) {
            setGrantedScopes(getGrantedScopes());
        }
    }, [isAuthenticated, getGrantedScopes]);

    const handleScopeChange = (scope: string, checked: boolean) => {
        setSelectedScopes(prev => 
            checked ? [...prev, scope] : prev.filter(s => s !== scope)
        );
    };

    const handleSignIn = async () => {
        setRequestError(null);
        if (selectedScopes.length === 0) {
            setRequestError("Please select at least one permission to grant.");
            return;
        }
        const success = await signIn(selectedScopes);
        if (success) {
            setGrantedScopes(getGrantedScopes());
        }
    };

    const handleSignOut = async () => {
        await signOut();
        setGrantedScopes([]);
        setSelectedScopes([]);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <div className="w-full max-w-2xl mx-auto bg-textured shadow-lg rounded-lg p-8">
                <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-200 mb-2">
                    Connect Your Google Account
                </h1>
                <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                    Select the permissions you want to grant and connect your account.
                </p>

                <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-4">Select Permissions</h2>
                    <div className="space-y-4">
                        {SCOPE_OPTIONS.map(({ id, label, scope, description }) => (
                            <div key={id} className="flex items-start space-x-3">
                                <Checkbox 
                                    id={id} 
                                    onCheckedChange={(checked) => handleScopeChange(scope, !!checked)}
                                    checked={selectedScopes.includes(scope)}
                                    className="mt-1"
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor={id} className="text-base font-medium text-gray-800 dark:text-gray-200">
                                        {label}
                                    </Label>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {requestError && <p className="text-sm text-center text-red-500 mb-4">{requestError}</p>}

                <div className="flex items-center justify-center space-x-4 mb-6">
                    <button
                        onClick={handleSignIn}
                        disabled={isInitializing || !isGoogleLoaded || isAuthenticated || selectedScopes.length === 0}
                        className="px-6 py-2 text-white font-semibold bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isInitializing ? "Initializing..." : "Connect & Grant Access"}
                    </button>
                    <button
                        onClick={handleSignOut}
                        disabled={!isAuthenticated}
                        className="px-6 py-2 text-white font-semibold bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-400"
                    >
                        Disconnect
                    </button>
                </div>

                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Connection Status</h2>
                    <div className="space-y-2 text-sm">
                        <p><strong>Status:</strong> {
                            isInitializing ? <span className="text-yellow-600 dark:text-yellow-400">Initializing...</span> :
                            isAuthenticated ? <span className="text-green-600 dark:text-green-400">Connected</span> :
                            <span className="text-red-600 dark:text-red-400">Not Connected</span>
                        }</p>
                        {error && <p><strong>Error:</strong> <span className="text-red-500">{error}</span></p>}
                        
                        <div className="pt-2">
                            <h3 className="font-semibold mb-1">Granted Permissions:</h3>
                            {grantedScopes.length > 0 ? (
                                <ul className="list-disc list-inside bg-textured p-3 rounded-md">
                                    {grantedScopes.map(scope => (
                                        <li key={scope}><code>{scope}</code></li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400">{isAuthenticated ? "No permissions granted yet. You may need to grant access." : "Connect your account to see granted permissions."}</p>
                            )}
                        </div>

                         {isAuthenticated && token && (
                            <div className="pt-2">
                                <h3 className="font-semibold mb-1">Access Token (for verification):</h3>
                                <p className="text-xs break-all bg-textured p-2 rounded-md">
                                    {token.substring(0, 30)}...
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 