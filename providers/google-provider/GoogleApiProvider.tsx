"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

// Type definitions for Google Identity Services
declare global {
    interface Window {
        google: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: TokenClientConfig) => TokenClient;
                    revoke: (token: string, callback: () => void) => void;
                };
            };
        };
        googleOneTapPrompt?: boolean;
    }
}

// Google API types
interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: ErrorResponse) => void;
}

interface TokenClient {
    requestAccessToken: () => void;
}

interface TokenResponse {
    access_token: string;
    scope: string;
    expires_in: number;
    token_type: string;
    error?: string;
    error_description?: string;
}

interface ErrorResponse {
    type: string;
    message?: string;
}

interface GoogleAPIContextType {
    isGoogleLoaded: boolean;
    isAuthenticated: boolean;
    isInitializing: boolean;
    error: string | null;
    token: string | null;
    signIn: (scopesToRequest: string[]) => Promise<boolean>;
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
    signIn: async () => false,
    signOut: async () => {},
    getGrantedScopes: () => [],
    requestScopes: async () => false,
    resetError: () => {},
});

export const useGoogleAPI = (scopes?: string[]) => {
    const context = useContext(GoogleAPIContext);
    if (context === undefined) {
        throw new Error("useGoogleAPI must be used within a GoogleAPIProvider");
    }
    return context;
};

interface GoogleAPIProviderProps {
    children: React.ReactNode;
    scopes?: string[];
}

const TOKEN_STORAGE_KEY = "google_auth_token";
const SCOPES_STORAGE_KEY = "google_auth_scopes";

export default function GoogleAPIProvider({ children, scopes }: GoogleAPIProviderProps) {
    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [grantedScopes, setGrantedScopes] = useState<string[]>([]);
    const [authInProgress, setAuthInProgress] = useState(false);

    const tokenClientRef = useRef<TokenClient | null>(null);
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    const resetError = useCallback(() => setError(null), []);

    const defaultScopes = [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/presentations",
        "https://www.googleapis.com/auth/tasks",
    ];

    const allScopes = scopes || defaultScopes;

    const saveAuthToStorage = useCallback((newToken: string, newScopes: string[]) => {
        try {
            localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
            localStorage.setItem(SCOPES_STORAGE_KEY, JSON.stringify(newScopes));
        } catch (e) {
            console.error("Error saving to localStorage:", e);
        }
    }, []);

    const handleCredentialResponse = useCallback(
        (response: TokenResponse) => {
            console.log("Full response:", response);
            if (response.access_token) {
                console.log("Token:", response.access_token);
                setToken(response.access_token);
                setIsAuthenticated(true);
                const newScopes = response.scope ? response.scope.split(" ") : [];
                setGrantedScopes(prevScopes => {
                    const updatedScopes = [...new Set([...prevScopes, ...newScopes])];
                    saveAuthToStorage(response.access_token, updatedScopes);
                    return updatedScopes;
                });
                return true;
            } else {
                console.log("No token in response.");
                if (response.error) {
                    setError(`Google Auth Error: ${response.error_description || response.error}`);
                }
                return false;
            }
        },
        [saveAuthToStorage]
    );

    // Restore auth from localStorage
    useEffect(() => {
        try {
            const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
            const savedScopes = localStorage.getItem(SCOPES_STORAGE_KEY);
            if (savedToken) {
                setToken(savedToken);
                setIsAuthenticated(true);
                if (savedScopes) {
                    const parsedScopes = JSON.parse(savedScopes);
                    if (Array.isArray(parsedScopes)) setGrantedScopes(parsedScopes);
                }
            }
        } catch (e) {
            console.error("Error accessing localStorage:", e);
        }
    }, []);

    const clearAuthFromStorage = useCallback(() => {
        try {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(SCOPES_STORAGE_KEY);
        } catch (e) {
            console.error("Error clearing localStorage:", e);
        }
    }, []);

    // Load Google Identity Services
    useEffect(() => {
        if (!clientId) {
            setError("Missing Google API Client ID.");
            setIsInitializing(false);
            return;
        }

        const loadGoogleIdentityServices = () => {
            if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
                checkGoogleLoaded();
                return;
            }
            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            script.onload = checkGoogleLoaded;
            script.onerror = () => {
                setError("Failed to load Google Identity Services");
                setIsInitializing(false);
            };
            document.body.appendChild(script);
        };

        const checkGoogleLoaded = () => {
            if (window.google?.accounts) {
                setIsGoogleLoaded(true);
                setIsInitializing(false);
            } else {
                setTimeout(checkGoogleLoaded, 100);
            }
        };

        loadGoogleIdentityServices();
    }, [clientId]);

    const initTokenClient = useCallback((scopesToRequest: string[]) => {
        if (!window.google?.accounts?.oauth2 || !clientId) return null;

        return window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: scopesToRequest.join(" "),
            callback: (response: TokenResponse) => {
                console.log("Token client callback fired:", response);
                handleCredentialResponse(response);
                setAuthInProgress(false);
            },
            error_callback: (err: ErrorResponse) => {
                console.log("Token client error:", err);
                setAuthInProgress(false);
                if (err.type !== "popup_closed" && err.type !== "popup_closed_by_user") {
                    setError(`Auth failed: ${err.type}`);
                }
            },
        });
    }, [clientId, handleCredentialResponse]);

    const signIn = async (scopesToRequest: string[]) => {
        if (!isGoogleLoaded || !window.google?.accounts) {
            setError("Google auth not initialized.");
            return false;
        }
        if (authInProgress) {
            console.log("Auth in progress, skipping...");
            return false;
        }

        resetError();
        setAuthInProgress(true);

        return new Promise<boolean>((resolve) => {
            const finalScopes = scopesToRequest.length > 0 ? scopesToRequest : allScopes;
            
            tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: finalScopes.join(" "),
                callback: (response: TokenResponse) => {
                    const success = handleCredentialResponse(response);
                    resolve(success);
                    setAuthInProgress(false);
                },
                error_callback: (err: ErrorResponse) => {
                    console.log("Token client error:", err);
                    setAuthInProgress(false);
                    if (err.type !== "popup_closed" && err.type !== "popup_closed_by_user") {
                        setError(`Auth failed: ${err.type}`);
                    }
                    resolve(false);
                },
            });
            tokenClientRef.current.requestAccessToken();
        });
    };

    const signOut = async () => {
        if (!isGoogleLoaded || !window.google?.accounts) {
            setError("Google auth not initialized.");
            return;
        }
        try {
            if (token) {
                window.google.accounts.oauth2.revoke(token, () => {
                    setToken(null);
                    setIsAuthenticated(false);
                    setGrantedScopes([]);
                    clearAuthFromStorage();
                    resetError();
                });
            } else {
                setIsAuthenticated(false);
                setGrantedScopes([]);
                clearAuthFromStorage();
                resetError();
            }
        } catch (err: any) {
            console.error("Sign-out error:", err);
            setError(`Sign-out failed: ${err.message}`);
        }
    };

    const getGrantedScopes = useCallback(() => grantedScopes, [grantedScopes]);

    const requestScopes = async (scopes: string[]): Promise<boolean> => {
        if (!isGoogleLoaded || !window.google?.accounts || !tokenClientRef.current) {
            setError("Google auth not ready.");
            return false;
        }
        if (authInProgress) {
            console.log("Auth in progress, skipping...");
            return false;
        }

        resetError();
        setAuthInProgress(true);

        return new Promise<boolean>((resolve) => {
            const client = initTokenClient(scopes);
            if (client) {
                client.requestAccessToken();
                tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: scopes.join(" "),
                    callback: (response: TokenResponse) => {
                        console.log("Scope request callback fired:", response);
                        const success = handleCredentialResponse(response);
                        resolve(success);
                        setAuthInProgress(false);
                    },
                    error_callback: (err: ErrorResponse) => {
                        console.log("Scope request error:", err);
                        setAuthInProgress(false);
                        if (err.type !== "popup_closed" && err.type !== "popup_closed_by_user") {
                            setError(`Scope request failed: ${err.type}`);
                        }
                        resolve(false);
                    },
                });
                console.log("Requesting scopes:", scopes);
                tokenClientRef.current.requestAccessToken();
            } else {
                setError("Failed to initialize Google token client for scope request.");
                setAuthInProgress(false);
                resolve(false);
            }
        });
    };
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
