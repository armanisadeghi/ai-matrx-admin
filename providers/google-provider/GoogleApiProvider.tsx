"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

// Type definitions for TypeScript
declare global {
    interface Window {
        gapi: any;
    }
}

// Create a context to share Google API state across components
interface GoogleAPIContextType {
    isGapiLoaded: boolean;
    isAuthenticated: boolean;
    isInitializing: boolean;
    error: string | null;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    getGrantedScopes: () => string[];
}

const GoogleAPIContext = createContext<GoogleAPIContextType>({
    isGapiLoaded: false,
    isAuthenticated: false,
    isInitializing: true,
    error: null,
    signIn: async () => {},
    signOut: async () => {},
    getGrantedScopes: () => [],
});

export const useGoogleAPI = () => useContext(GoogleAPIContext);

interface GoogleAPIProviderProps {
    children: React.ReactNode;
}

export default function GoogleAPIProvider({ children }: GoogleAPIProviderProps) {
    const [isGapiLoaded, setIsGapiLoaded] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [authInstance, setAuthInstance] = useState<any>(null);

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    // Debug information to help diagnose issues
    useEffect(() => {
        console.log("Google Client ID available:", !!clientId);
        if (!clientId) {
            setError("Missing Google API Client ID. Check your environment variables.");
            setIsInitializing(false);
        }
    }, [clientId]);

    // Load the Google API client library
    useEffect(() => {
        if (!clientId) return; // Don't proceed if clientId is missing

        const loadGapiAndInitAuth = () => {
            // Check if GAPI is already loaded
            if (window.gapi) {
                initializeGapiClient();
                return;
            }

            // Load the GAPI script
            const script = document.createElement("script");
            script.src = "https://apis.google.com/js/api.js";
            script.async = true;
            script.defer = true;
            script.onload = initializeGapiClient;
            script.onerror = (e) => {
                console.error("Failed to load Google API script:", e);
                setError("Failed to load Google API client");
                setIsInitializing(false);
            };
            document.body.appendChild(script);
        };

        const initializeGapiClient = () => {
            window.gapi.load(
                "client:auth2",
                () => {
                    try {
                        // Define all scopes we might use
                        const scopes = [
                            "https://www.googleapis.com/auth/drive",
                            "https://www.googleapis.com/auth/gmail.send",
                            "https://www.googleapis.com/auth/calendar",
                            "https://www.googleapis.com/auth/documents",
                            "https://www.googleapis.com/auth/spreadsheets",
                            "https://www.googleapis.com/auth/presentations",
                            "https://www.googleapis.com/auth/tasks",
                        ].join(" ");

                        // Log initialization attempt
                        console.log(
                            "Initializing Google API client with client ID:",
                            clientId ? clientId.substring(0, 8) + "..." : "undefined"
                        );

                        // Initialize the client step by step to catch specific errors
                        window.gapi.client
                            .init({
                                clientId: clientId,
                                scope: scopes,
                            })
                            .then(() => {
                                console.log("Google API client initialized successfully");
                                if (window.gapi.auth2) {
                                    const auth = window.gapi.auth2.getAuthInstance();
                                    setAuthInstance(auth);
                                    setIsAuthenticated(auth.isSignedIn.get());

                                    // Listen for sign-in state changes
                                    auth.isSignedIn.listen((signedIn: boolean) => {
                                        setIsAuthenticated(signedIn);
                                    });
                                } else {
                                    console.error("Auth2 module not available");
                                    setError("Google Auth module not available");
                                }
                                setIsGapiLoaded(true);
                            })
                            .catch((err: any) => {
                                console.error("Detailed error initializing GAPI client:", JSON.stringify(err, null, 2));
                                setError(`Failed to initialize Google API client: ${err.details || err.message || "Unknown error"}`);
                            })
                            .finally(() => {
                                setIsInitializing(false);
                            });
                    } catch (err: any) {
                        console.error("Error during Google API initialization:", err);
                        setError(`Error setting up Google API: ${err.message || "Unknown error"}`);
                        setIsInitializing(false);
                    }
                },
                (err: any) => {
                    console.error("Failed to load client:auth2 module:", err);
                    setError("Failed to load Google authentication module");
                    setIsInitializing(false);
                }
            );
        };

        loadGapiAndInitAuth();

        // Cleanup function to stop listening to auth changes
        return () => {
            if (window.gapi && window.gapi.auth2) {
                try {
                    const auth = window.gapi.auth2.getAuthInstance();
                    if (auth) {
                        auth.isSignedIn.listen(() => {});
                    }
                } catch (err) {
                    console.error("Error cleaning up auth listener:", err);
                }
            }
        };
    }, [clientId]);

    // Sign in function
    const signIn = async () => {
        if (!authInstance) {
            setError("Google authentication not initialized");
            return;
        }

        try {
            const user = await authInstance.signIn();
            console.log("User signed in:", user ? user.getBasicProfile().getName() : "unknown");
        } catch (err: any) {
            console.error("Error signing in:", err);
            if (err.error === "popup_blocked_by_browser") {
                setError("Sign-in popup was blocked by the browser. Please allow popups for this site.");
            } else if (err.error === "access_denied") {
                setError("You declined to grant access to the application.");
            } else {
                setError(`Failed to sign in with Google: ${err.error || err.message || "Unknown error"}`);
            }
        }
    };

    // Sign out function
    const signOut = async () => {
        if (!authInstance) {
            setError("Google authentication not initialized");
            return;
        }

        try {
            await authInstance.signOut();
            console.log("User signed out");
        } catch (err: any) {
            console.error("Error signing out:", err);
            setError(`Failed to sign out: ${err.message || "Unknown error"}`);
        }
    };

    // Get scopes that the user has granted
    const getGrantedScopes = () => {
        if (!authInstance || !isAuthenticated) return [];

        try {
            const currentUser = authInstance.currentUser.get();
            const scopes = currentUser.getGrantedScopes().split(" ");
            return scopes;
        } catch (err) {
            console.error("Error getting scopes:", err);
            return [];
        }
    };

    // Provide the Google API context to all children
    return (
        <GoogleAPIContext.Provider
            value={{
                isGapiLoaded,
                isAuthenticated,
                isInitializing,
                error,
                signIn,
                signOut,
                getGrantedScopes,
            }}
        >
            {children}
        </GoogleAPIContext.Provider>
    );
}
