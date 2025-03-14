"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

// Type definitions for TypeScript
declare global {
    interface Window {
        google: any;
        googleOneTapPrompt?: boolean;
    }
}

// Create a context to share Google API state across components
interface GoogleAPIContextType {
    isGoogleLoaded: boolean;
    isAuthenticated: boolean;
    isInitializing: boolean;
    error: string | null;
    token: string | null;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    getGrantedScopes: () => string[];
    requestScopes: (scopes: string[]) => Promise<boolean>;
    resetError: () => void;
}

const GoogleAPIContext = createContext<GoogleAPIContextType>({
    isGoogleLoaded: false,
    isAuthenticated: false,
    isInitializing: true,
    error: null,
    token: null,
    signIn: async () => {},
    signOut: async () => {},
    getGrantedScopes: () => [],
    requestScopes: async () => false,
    resetError: () => {},
});

export const useGoogleAPI = () => useContext(GoogleAPIContext);

interface GoogleAPIProviderProps {
    children: React.ReactNode;
}

export default function GoogleAPIProvider({ children }: GoogleAPIProviderProps) {
    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [grantedScopes, setGrantedScopes] = useState<string[]>([]);
    const [authInProgress, setAuthInProgress] = useState(false);

    // Use refs to keep track of token clients
    const tokenClientRef = useRef<any>(null);

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    // Reset error helper function
    const resetError = useCallback(() => {
        setError(null);
    }, []);

    // Define the scopes we might need
    const allScopes = [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/presentations",
        "https://www.googleapis.com/auth/tasks",
    ];

    // Debug information to help diagnose issues
    useEffect(() => {
        console.log("Google Client ID available:", !!clientId);
        if (!clientId) {
            setError("Missing Google API Client ID. Check your environment variables.");
            setIsInitializing(false);
        }
    }, [clientId]);

    // Load Google Identity Services
    useEffect(() => {
        if (!clientId) return;

        const loadGoogleIdentityServices = () => {
            // Don't load it again if it's already in the document
            if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
                console.log("Google Identity Services script already loaded");
                checkGoogleLoaded();
                return;
            }

            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            script.onload = () => {
                console.log("Google Identity Services script loaded");
                checkGoogleLoaded();
            };
            script.onerror = (e) => {
                console.error("Failed to load Google Identity Services:", e);
                setError("Failed to load Google Identity Services");
                setIsInitializing(false);
            };
            document.body.appendChild(script);
        };

        const checkGoogleLoaded = () => {
            if (window.google && window.google.accounts) {
                console.log("Google Identity Services detected");
                setIsGoogleLoaded(true);
                setIsInitializing(false);
                initializeTokenClient();
            } else {
                // If the script is there but not loaded yet, wait a bit
                setTimeout(checkGoogleLoaded, 100);
            }
        };

        const initializeTokenClient = () => {
            if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
                console.log("Google Identity Services not fully loaded yet");
                return;
            }

            try {
                console.log("Initializing token client");
                tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: allScopes.join(" "),
                    callback: (response: any) => {
                        handleCredentialResponse(response);
                        setAuthInProgress(false);
                    },
                    error_callback: (err: any) => {
                        console.log("Token client error callback triggered:", err);
                        setAuthInProgress(false);

                        // Only set an error if this wasn't user-initiated
                        if (err.type !== "popup_closed_by_user") {
                            setError(`Authentication error: ${err.type || "Unknown error"}`);
                        }
                    },
                });
            } catch (err) {
                console.error("Error initializing token client:", err);
            }
        };

        loadGoogleIdentityServices();
    }, [clientId, allScopes]);

    // Handle the credential response
    const handleCredentialResponse = useCallback(
        (response: any) => {
            console.log("Received credential response:", response ? "response object" : "no response");

            if (response && response.access_token) {
                console.log("Access token received");
                setToken(response.access_token);
                setIsAuthenticated(true);

                // Handle scopes
                if (response.scope) {
                    const scopeArray = response.scope.split(" ");
                    setGrantedScopes(scopeArray);
                    console.log("Granted scopes count:", scopeArray.length);
                }

                resetError(); // Clear any previous errors
            } else if (response && response.error) {
                console.error("Authentication response error:", response.error);

                // Don't show errors for user-initiated cancellations
                if (response.error !== "popup_closed_by_user") {
                    setError(`Authentication error: ${response.error}`);
                }
            }
        },
        [resetError]
    );

    // Sign in function
    const signIn = async () => {
        if (!isGoogleLoaded || !window.google || !window.google.accounts) {
            setError("Google authentication not initialized yet. Please try again in a moment.");
            return;
        }

        if (authInProgress) {
            console.log("Auth already in progress, ignoring additional sign-in attempt");
            return;
        }

        resetError(); // Clear any previous errors
        setAuthInProgress(true);

        try {
            if (!tokenClientRef.current) {
                console.log("Token client not initialized, creating it now");
                tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: allScopes.join(" "),
                    callback: (response: any) => {
                        handleCredentialResponse(response);
                        setAuthInProgress(false);
                    },
                    error_callback: (err: any) => {
                        console.log("Token client error callback triggered:", err);
                        setAuthInProgress(false);

                        // Only set an error if this wasn't user-initiated
                        if (err.type !== "popup_closed_by_user") {
                            setError(`Authentication error: ${err.type || "Unknown error"}`);
                        }
                    },
                });
            }

            // Use a timeout to catch situations where the popup never appears or is blocked
            const popupTimeout = setTimeout(() => {
                if (authInProgress) {
                    console.log("Popup may be blocked or not appearing");
                    setAuthInProgress(false);
                    setError("The Google sign-in popup may be blocked by your browser. Please enable popups for this site.");
                }
            }, 3000);

            // Request a token
            tokenClientRef.current.requestAccessToken();

            // Cancel the timeout if we get a quick response (normal case)
            setTimeout(() => clearTimeout(popupTimeout), 1000);
        } catch (err: any) {
            console.error("Error initializing sign-in:", err);
            setError(`Failed to initialize sign-in: ${err.message || "Unknown error"}`);
            setAuthInProgress(false);
        }
    };

    // Sign out function
    const signOut = async () => {
        if (!isGoogleLoaded || !window.google || !window.google.accounts) {
            setError("Google authentication not initialized");
            return;
        }

        try {
            // Revoke the token
            if (token) {
                window.google.accounts.oauth2.revoke(token, () => {
                    console.log("Token revoked");
                    setToken(null);
                    setIsAuthenticated(false);
                    setGrantedScopes([]);
                    resetError(); // Clear any errors
                });
            } else {
                // If we don't have a token, just reset the state
                setIsAuthenticated(false);
                setGrantedScopes([]);
                resetError();
            }
        } catch (err: any) {
            console.error("Error signing out:", err);
            setError(`Failed to sign out: ${err.message || "Unknown error"}`);
        }
    };

    // Get scopes that the user has granted
    const getGrantedScopes = useCallback(() => {
        return grantedScopes;
    }, [grantedScopes]);

    // Request additional scopes
    const requestScopes = async (scopes: string[]): Promise<boolean> => {
        if (!isGoogleLoaded || !window.google || !window.google.accounts) {
            setError("Google authentication not initialized");
            return false;
        }

        if (authInProgress) {
            console.log("Auth already in progress, ignoring scope request");
            return false;
        }

        resetError(); // Clear any previous errors
        setAuthInProgress(true);

        return new Promise((resolve) => {
            try {
                // Configure the client with the new scopes
                const scopeClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: scopes.join(" "),
                    callback: (response: any) => {
                        setAuthInProgress(false);

                        if (response && response.access_token) {
                            // Update the granted scopes
                            if (response.scope) {
                                const scopeArray = response.scope.split(" ");
                                setGrantedScopes((prev) => {
                                    const newScopes = [...prev];
                                    scopeArray.forEach((scope) => {
                                        if (!newScopes.includes(scope)) {
                                            newScopes.push(scope);
                                        }
                                    });
                                    return newScopes;
                                });
                            }
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    },
                    error_callback: (err: any) => {
                        console.log("Scope client error callback triggered:", err);
                        setAuthInProgress(false);

                        // Only set an error if this wasn't user-initiated
                        if (err.type !== "popup_closed_by_user") {
                            setError(`Authorization error: ${err.type || "Unknown error"}`);
                        }

                        resolve(false);
                    },
                });

                // Request the token with new scopes
                scopeClient.requestAccessToken();
            } catch (err: any) {
                console.error("Error requesting scopes:", err);
                setError(`Failed to request additional permissions: ${err.message || "Unknown error"}`);
                setAuthInProgress(false);
                resolve(false);
            }
        });
    };

    // Provide the Google API context to all children
    return (
        <GoogleAPIContext.Provider
            value={{
                isGoogleLoaded,
                isAuthenticated,
                isInitializing,
                error,
                token,
                signIn,
                signOut,
                getGrantedScopes,
                requestScopes,
                resetError,
            }}
        >
            {children}
        </GoogleAPIContext.Provider>
    );
}
