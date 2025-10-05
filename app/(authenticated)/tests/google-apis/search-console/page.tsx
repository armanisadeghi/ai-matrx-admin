"use client";

import { useState, useEffect } from "react";
import { useGoogleAPI } from "@/providers/google-provider/GoogleApiProvider";
import { PropertySelector } from "./components/PropertySelector";
import { SearchAnalytics } from "./components/SearchAnalytics";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Search, LogIn } from "lucide-react";
import type { SiteProperty } from "./types";

const REQUIRED_SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

export default function SearchConsolePage() {
    const { signIn, isAuthenticated, isGoogleLoaded, token, getGrantedScopes } = useGoogleAPI();
    const [selectedProperty, setSelectedProperty] = useState<SiteProperty | null>(null);
    const [error, setError] = useState<string | null>(null);

    const hasRequiredScope = () => {
        const scopes = getGrantedScopes();
        return scopes.some(scope => 
            scope.includes('webmasters.readonly') || scope.includes('webmasters')
        );
    };

    const handleSignIn = async () => {
        setError(null);
        const success = await signIn(REQUIRED_SCOPES);
        if (!success) {
            setError("Failed to authenticate. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="space-y-6">
                {/* Header */}
                <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700 p-6 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Search className="w-7 h-7 text-white flex-shrink-0" />
                            <div>
                                <h1 className="text-2xl font-bold text-white">Google Search Console</h1>
                                <p className="text-green-100 text-xs font-medium">Search Performance Analytics</p>
                            </div>
                        </div>

                        {!isAuthenticated && isGoogleLoaded && (
                            <Button
                                onClick={handleSignIn}
                                className="bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-gray-700 font-semibold flex items-center gap-2"
                            >
                                <LogIn className="w-4 h-4" />
                                Sign In with Google
                            </Button>
                        )}
                    </div>
                </div>

                {/* Loading State */}
                {!isGoogleLoaded && (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                            <Loader2 className="h-5 w-5 animate-spin text-green-600 dark:text-green-400" />
                            <span>Loading Google API...</span>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-red-800 dark:text-red-200">
                            {error}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Not Authenticated State */}
                {isGoogleLoaded && !isAuthenticated && (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
                        <Search className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            Sign In Required
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Connect your Google account to access Search Console data
                        </p>
                        <Button
                            onClick={handleSignIn}
                            className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white"
                        >
                            <LogIn className="w-4 h-4 mr-2" />
                            Sign In with Google
                        </Button>
                    </div>
                )}

                {/* Authenticated - Show Property Selector and Analytics */}
                {isAuthenticated && hasRequiredScope() && token && (
                    <>
                        <PropertySelector
                            token={token}
                            selectedProperty={selectedProperty}
                            onSelectProperty={setSelectedProperty}
                        />

                        {selectedProperty && (
                            <SearchAnalytics
                                token={token}
                                property={selectedProperty}
                            />
                        )}
                    </>
                )}

                {/* Missing Scope Warning */}
                {isAuthenticated && !hasRequiredScope() && (
                    <Alert className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                        <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        <AlertDescription className="text-orange-800 dark:text-orange-200">
                            Missing required permissions. Please sign in again to grant Search Console access.
                            <Button
                                onClick={handleSignIn}
                                size="sm"
                                className="ml-3 bg-orange-600 hover:bg-orange-700 text-white"
                            >
                                Re-authenticate
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    );
}

