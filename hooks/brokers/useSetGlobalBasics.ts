"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { brokerConceptActions } from "@/lib/redux/brokerSlice";

// Add TypeScript declarations for experimental browser APIs
interface NetworkInformation extends EventTarget {
    readonly effectiveType: string;
    readonly downlink: number;
    readonly rtt: number;
    readonly saveData: boolean;
    readonly type: string;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

interface NavigatorExtended extends Navigator {
    connection?: NetworkInformation;
    getBattery?: () => Promise<{
        level: number;
        charging: boolean;
        addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
        removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
    }>;
}

export function useSetGlobalBasics() {
    const dispatch = useAppDispatch();
    
    // Browser-specific code wrapped in useEffect to ensure client-side only execution
    useEffect(() => {
        // Only run in browser environment
        if (typeof window === 'undefined') return;
        
        // Now safe to use browser APIs
        const nav = navigator as NavigatorExtended;
        
        // Browser Info
        dispatch(
            brokerConceptActions.setValue({
                brokerId: "GLOBAL_BROWSER_INFO",
                value: nav.userAgent,
            })
        );

        // Device Type (Basic detection)
        const isMobile = /Mobi|Android/i.test(nav.userAgent);
        dispatch(
            brokerConceptActions.setValue({
                brokerId: "GLOBAL_DEVICE_TYPE",
                value: isMobile ? "mobile" : "desktop",
            })
        );

        // Screen Resolution
        dispatch(
            brokerConceptActions.setValue({
                brokerId: "GLOBAL_SCREEN_RESOLUTION",
                value: `${window.screen.width}x${window.screen.height}`,
            })
        );

        // Language Preference
        dispatch(
            brokerConceptActions.setValue({
                brokerId: "GLOBAL_BROWSER_LANGUAGE",
                value: nav.language || nav.languages[0],
            })
        );

        // Current Date
        dispatch(
            brokerConceptActions.setValue({
                brokerId: "GLOBAL_CURRENT_DATE",
                value: new Date().toISOString().split("T")[0], // e.g., "2025-05-15"
            })
        );

        // Current Timestamp
        dispatch(
            brokerConceptActions.setValue({
                brokerId: "GLOBAL_CURRENT_TIMESTAMP",
                value: Date.now(),
            })
        );

        // Formatted Date
        dispatch(
            brokerConceptActions.setValue({
                brokerId: "GLOBAL_FORMATTED_DATE",
                value: new Date().toLocaleDateString(), // e.g., "5/15/2025"
            })
        );

        // User Timezone
        dispatch(
            brokerConceptActions.setValue({
                brokerId: "GLOBAL_USER_TIMEZONE",
                value: Intl.DateTimeFormat().resolvedOptions().timeZone, // e.g., "America/New_York"
            })
        );

        // Platform/OS
        dispatch(
            brokerConceptActions.setValue({
                brokerId: "GLOBAL_PLATFORM",
                value: nav.platform || "unknown", // e.g., "Win32", "MacIntel"
            })
        );

        // Cookies Enabled
        dispatch(
            brokerConceptActions.setValue({
                brokerId: "GLOBAL_COOKIES_ENABLED",
                value: nav.cookieEnabled, // true or false
            })
        );

        // Color Scheme Preference
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        dispatch(
            brokerConceptActions.setValue({
                brokerId: "GLOBAL_COLOR_SCHEME",
                value: prefersDark ? "dark" : "light",
            })
        );
        
        // Network Status
        dispatch(
            brokerConceptActions.setValue({
                brokerId: "GLOBAL_NETWORK_STATUS",
                value: nav.onLine ? "online" : "offline",
            })
        );

        // Connection Type (if supported)
        if (nav.connection) {
            dispatch(
                brokerConceptActions.setValue({
                    brokerId: "GLOBAL_CONNECTION_TYPE",
                    value: nav.connection.effectiveType || "unknown", // e.g., "4g", "wifi"
                })
            );
        }

        // Event Listeners for Network Changes
        const updateNetworkStatus = () => {
            dispatch(
                brokerConceptActions.setValue({
                    brokerId: "GLOBAL_NETWORK_STATUS",
                    value: nav.onLine ? "online" : "offline",
                })
            );
        };

        window.addEventListener("online", updateNetworkStatus);
        window.addEventListener("offline", updateNetworkStatus);

        if (nav.connection) {
            const updateConnectionType = () => {
                dispatch(
                    brokerConceptActions.setValue({
                        brokerId: "GLOBAL_CONNECTION_TYPE",
                        value: nav.connection.effectiveType || "unknown",
                    })
                );
            };
            nav.connection.addEventListener("change", updateConnectionType);
        }

        // Window Dimensions
        const updateWindowDimensions = () => {
            dispatch(
                brokerConceptActions.setValue({
                    brokerId: "GLOBAL_WINDOW_DIMENSIONS",
                    value: {
                        width: window.innerWidth,
                        height: window.innerHeight,
                    },
                })
            );
        };

        // Initial Dimensions
        updateWindowDimensions();

        // Update on Resize
        window.addEventListener("resize", updateWindowDimensions);
        
        // Battery Status (if supported)
        if (nav.getBattery) {
            nav.getBattery().then((battery) => {
                const updateBatteryStatus = () => {
                    dispatch(
                        brokerConceptActions.setValue({
                            brokerId: "GLOBAL_BATTERY_STATUS",
                            value: {
                                level: battery.level * 100, // e.g., 75 (%)
                                charging: battery.charging, // true or false
                            },
                        })
                    );
                };

                // Initial Battery Status
                updateBatteryStatus();

                // Event Listeners for Battery Changes
                battery.addEventListener("levelchange", updateBatteryStatus);
                battery.addEventListener("chargingchange", updateBatteryStatus);
            });
        } else {
            // Fallback if Battery API is unsupported
            dispatch(
                brokerConceptActions.setValue({
                    brokerId: "GLOBAL_BATTERY_STATUS",
                    value: null,
                })
            );
        }

        // Color Scheme Preference with media query listener
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const updateColorScheme = () => {
            dispatch(
                brokerConceptActions.setValue({
                    brokerId: "GLOBAL_COLOR_SCHEME",
                    value: mediaQuery.matches ? "dark" : "light",
                })
            );
        };

        // Initial Color Scheme
        updateColorScheme();

        // Update on Change
        mediaQuery.addEventListener("change", updateColorScheme);
        
        // Geolocation
        if (nav.geolocation) {
            nav.geolocation.getCurrentPosition(
                (position) => {
                    dispatch(
                        brokerConceptActions.setValue({
                            brokerId: "GLOBAL_USER_COORDINATES",
                            value: {
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude,
                            },
                        })
                    );
                },
                (error) => {
                    console.warn("Geolocation unavailable:", error);
                    dispatch(
                        brokerConceptActions.setValue({
                            brokerId: "GLOBAL_USER_COORDINATES",
                            value: null,
                        })
                    );
                }
            );
        }

        // Cleanup function
        return () => {
            window.removeEventListener("online", updateNetworkStatus);
            window.removeEventListener("offline", updateNetworkStatus);
            window.removeEventListener("resize", updateWindowDimensions);
            mediaQuery.removeEventListener("change", updateColorScheme);
            
            if (nav.connection) {
                const updateConnectionType = () => {
                    dispatch(
                        brokerConceptActions.setValue({
                            brokerId: "GLOBAL_CONNECTION_TYPE",
                            value: nav.connection.effectiveType || "unknown",
                        })
                    );
                };
                nav.connection.removeEventListener("change", updateConnectionType);
            }
        };
    }, [dispatch]);
}
