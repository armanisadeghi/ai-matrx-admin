// lib/redux/socket/manager.ts
import { supabase } from "@/utils/supabase/client";
import { logTaskStart, logFallbackResponse, logFallbackData, logTaskConfirmed, logDirectResponse } from "./manager-debug";
import { eventChannel, EventChannel } from 'redux-saga';

const DEBUG_MODE = true;

export class SocketManager {
    private static instance: SocketManager;
    private socket: any | null = null;
    private dynamicEventListeners: Map<string, (data: any) => void> = new Map();
    private streamingStatus: Map<string, boolean> = new Map(); // Track streaming status per event
    private readonly PRODUCTION_URL = "https://server.app.matrxserver.com";
    private readonly LOCAL_URL = "http://localhost:8000";
    private connectionPromise: Promise<void> | null = null;
    private isClientSide: boolean = typeof window !== "undefined";

    private constructor() {}

    static getInstance(): SocketManager {
        if (!SocketManager.instance) {
            SocketManager.instance = new SocketManager();
            if (SocketManager.instance.isClientSide) {
                SocketManager.instance.connect().catch((err) => {
                    console.error("[SOCKET MANAGER] Auto-connect failed:", err);
                });
            }
        }
        return SocketManager.instance;
    }

    private async getSocketAddress(): Promise<string> {
        const overrideUrl = process.env.NEXT_PUBLIC_SOCKET_OVERRIDE;
        if (overrideUrl) return overrideUrl;
        if (process.env.NODE_ENV === "production") return this.PRODUCTION_URL;
        const isLocalAvailable = await this.testLocalConnection();
        return isLocalAvailable ? this.LOCAL_URL : this.PRODUCTION_URL;
    }

    async connect(): Promise<void> {
        if (!this.isClientSide) {
            console.warn("[SOCKET MANAGER] Skipping connection: Not on client side");
            return;
        }
        if (this.socket?.connected) {
            return;
        }
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = (async () => {
            try {
                const { io } = await import("socket.io-client");
                const socketAddress = await this.getSocketAddress();
                const session = await supabase.auth.getSession();

                this.socket = io(`${socketAddress}/UserSession`, {
                    transports: ["polling", "websocket"],
                    withCredentials: true,
                    auth: { token: session.data.session.access_token },
                });

                await new Promise<void>((resolve, reject) => {
                    this.socket.on("connect", () => {
                        this.registerEventHandlers();
                        resolve();
                    });
                    this.socket.on("connect_error", (error: Error) => {
                        console.error("[SOCKET MANAGER] Socket connection error:", error.message);
                        reject(error);
                    });
                });
            } catch (error) {
                console.error("[SOCKET MANAGER] Error connecting socket:", error);
                this.socket = null;
                throw error;
            } finally {
                this.connectionPromise = null;
            }
        })();

        return this.connectionPromise;
    }

    async getSocket(): Promise<any> {
        if (!this.isClientSide) {
            console.warn("[SOCKET MANAGER] Socket unavailable: Not on client side");
            return null;
        }
        if (this.socket?.connected) {
            return this.socket;
        }
        if (!this.connectionPromise) {
            await this.connect();
        } else {
            await this.connectionPromise;
        }
        return this.socket;
    }

    disconnect() {
        if (this.socket && this.isClientSide) {
            this.cleanupDynamicListeners();
            this.socket.disconnect();
            this.socket = null;
            this.connectionPromise = null;
        }
    }

    private registerEventHandlers() {
        this.socket.on("connect", () => {});
        this.socket.on("disconnect", () => {});
    }

    // New method: Create an event channel for all socket events
    createEventChannel(): EventChannel<any> {
        return eventChannel((emit) => {
            if (!this.isClientSide || !this.socket) {
                console.warn("[SOCKET MANAGER] Cannot create event channel: No socket available");
                return () => {};
            }

            const handleEvent = (eventName: string, ...args: any[]) => {
                emit({ eventName, args });
            };

            this.socket.onAny(handleEvent);

            return () => {
                if (this.socket) {
                    this.socket.offAny(handleEvent);
                }
            };
        });
    }

    async startTask(eventName: string, data: any, callback: (response: any) => void): Promise<string> {
        const socket = await this.getSocket();
        if (!socket) return "";
        const sid = socket.id || "pending";
        const taskName = data[0]?.task;

        if (!taskName) {
            console.error("[SOCKET MANAGER] Task name not found in data");
            return "";
        }

        const taskIndex = data[0]?.index || 0;
        const defaultEventName = `${sid}_${taskName}_${taskIndex}`;

        if (DEBUG_MODE) {
            logTaskStart(eventName, data, sid);
        }

        const fallbackListener = (fallbackResponse: any) => {
            if (DEBUG_MODE) {
                logFallbackResponse(defaultEventName, fallbackResponse);
                logFallbackData(defaultEventName, fallbackResponse.data);
            }
            callback(fallbackResponse.data);
        };

        this.addDynamicEventListener(defaultEventName, fallbackListener);

        socket.emit(eventName, data, (response: { event_name?: string }) => {
            if (response?.event_name) {
                if (DEBUG_MODE) {
                    logTaskConfirmed(eventName, response.event_name);
                }
                this.removeDynamicEventListener(defaultEventName);
                this.addDynamicEventListener(response.event_name, (finalResponse: any) => {
                    if (DEBUG_MODE) {
                        logDirectResponse(response.event_name, finalResponse);
                    }
                    this.updateStreamingStatus(response.event_name, finalResponse);
                    callback(finalResponse.data);
                });
            }
        });

        return defaultEventName;
    }

    async startStreamingTasks<T>(event: string, tasks: T[], onStreamUpdate: (index: number, data: string) => void): Promise<string[]> {
        const socket = await this.getSocket();
        if (!socket) return [];
        const eventNames: string[] = [];
        for (let index = 0; index < tasks.length; index++) {
            const taskData = tasks[index];
            const singleTaskPayload = [{ ...taskData, index, stream: true }];
            const eventName = await this.startTask(event, singleTaskPayload, (response) => {
                if (response?.data) onStreamUpdate(index, response.data);
                else if (typeof response === "string") onStreamUpdate(index, response);
            });
            eventNames.push(eventName);
        }
        return eventNames;
    }

    // New method to check streaming status
    isStreaming(eventName: string): boolean {
        return this.streamingStatus.get(eventName) || false;
    }

    private updateStreamingStatus(eventName: string, response: any) {
        const isEnd = response?.end === true || response?.end === "true" || response?.end === "True";
        if (!this.streamingStatus.has(eventName)) {
            // If this is the first data for this event, assume streaming has started
            this.streamingStatus.set(eventName, true);
        } else if (isEnd) {
            // If end flag is present and true, streaming has ended
            this.streamingStatus.set(eventName, false);
        }
        // If response exists but no end flag, assume streaming continues
    }



    async createTask(eventName: string, data: any): Promise<string[]> {
        const socket = await this.getSocket();
        if (!socket) return [];
        return new Promise((resolve) => {
            const sid = socket.id || "pending";
            const eventNames: string[] = [];

            if (Array.isArray(data)) {
                data.forEach((taskData, index) => {
                    const taskName = taskData?.task;
                    if (!taskName) return resolve([]);
                    const taskIndex = taskData?.index ?? index;
                    eventNames.push(`${sid}_${taskName}_${taskIndex}`);
                });
            } else {
                const taskName = data?.task;
                if (!taskName) return resolve([]);
                const taskIndex = data?.index ?? 0;
                eventNames.push(`${sid}_${taskName}_${taskIndex}`);
            }

            socket.emit(eventName, data, () => resolve(eventNames));
        });
    }

    subscribeToEvent(eventName: string, callback: (data: any) => void): () => void {
        if (!this.isClientSide) return () => {};
        return this.addDynamicEventListener(eventName, callback);
    }

    addDynamicEventListener(eventName: string, listener: (data: any) => void): () => void {
        const socket = this.socket;
        if (!socket) return () => {};
        if (this.dynamicEventListeners.has(eventName)) {
            console.log(`[SOCKET MANAGER] Listener already exists for event: ${eventName}`);
            return () => {};
        }
        const wrappedListener = (data: any) => {
            this.updateStreamingStatus(eventName, data); // Update status on each event
            listener(data);
        };
        socket.on(eventName, wrappedListener);
        this.dynamicEventListeners.set(eventName, wrappedListener);
        return () => this.removeDynamicEventListener(eventName);
    }

    removeDynamicEventListener(eventName: string) {
        if (!this.socket) return;
        const listener = this.dynamicEventListeners.get(eventName);
        if (listener) {
            this.socket.off(eventName, listener);
            this.dynamicEventListeners.delete(eventName);
            this.streamingStatus.delete(eventName); // Clean up streaming status
        }
    }

    private cleanupDynamicListeners() {
        if (!this.socket) return;
        this.dynamicEventListeners.forEach((listener, eventName) => {
            this.socket.off(eventName, listener);
        });
        this.dynamicEventListeners.clear();
        this.streamingStatus.clear(); // Clear streaming status on cleanup
    }

    private async testLocalConnection(): Promise<boolean> {
        if (!this.isClientSide) return false;
        try {
            const { io } = await import("socket.io-client");
            return new Promise((resolve) => {
                const testSocket = io(this.LOCAL_URL, {
                    transports: ["polling", "websocket"],
                    timeout: 2000,
                    autoConnect: false,
                });

                testSocket.on("connect", () => {
                    testSocket.disconnect();
                    resolve(true);
                });

                testSocket.on("connect_error", () => {
                    testSocket.disconnect();
                    resolve(false);
                });

                testSocket.connect();
            });
        } catch (error) {
            console.log("[SOCKET MANAGER] Local connection test failed:", error);
            return false;
        }
    }
}