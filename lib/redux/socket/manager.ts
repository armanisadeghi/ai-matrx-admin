// lib/redux/socket/manager.ts
"use client";

import { logTaskStart, logFallbackResponse, logFallbackData, logTaskConfirmed, logDirectResponse } from "./manager-debug";
import { eventChannel, EventChannel } from "redux-saga";
import { SocketConnectionManager, SocketConfig } from "./core/connection-manager";

const DEBUG_MODE = true;

export class SocketManager {
    private static instance: SocketManager;
    private socket: any | null = null;
    private dynamicEventListeners: Map<string, (data: any) => void> = new Map();
    private streamingStatus: Map<string, boolean> = new Map();
    private connectionManager: SocketConnectionManager = SocketConnectionManager.getInstance();
    private isClientSide: boolean = typeof window !== "undefined";
    private config: SocketConfig = {
        url: "",
        namespace: "/UserSession",
    };

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

    async connect(): Promise<void> {
        if (this.socket?.connected) {
            return;
        }

        try {
            this.socket = await this.connectionManager.getSocket(this.config);
            if (this.socket) {
                this.registerEventHandlers();
            }
        } catch (error) {
            console.error("[SOCKET MANAGER] Error connecting socket:", error);
            this.socket = null;
            throw error;
        }
    }

    async getSocket(): Promise<any> {
        if (!this.socket || !this.socket.connected) {
            await this.connect();
        }
        return this.socket;
    }

    disconnect() {
        if (this.socket && this.isClientSide) {
            this.cleanupDynamicListeners();
            this.connectionManager.disconnect(this.config);
            this.socket = null;
        }
    }

    private registerEventHandlers() {
        this.socket.on("connect", () => {
            if (DEBUG_MODE) console.log("[SOCKET MANAGER] Connected");
        });
        this.socket.on("disconnect", () => {
            if (DEBUG_MODE) console.log("[SOCKET MANAGER] Disconnected");
        });
    }

    createEventChannel(): EventChannel<any> {
        return eventChannel((emit) => {
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

    isStreaming(eventName: string): boolean {
        return this.streamingStatus.get(eventName) || false;
    }

    private updateStreamingStatus(eventName: string, response: any) {
        const isEnd = response?.end === true || response?.end === "true" || response?.end === "True";
        if (!this.streamingStatus.has(eventName)) {
            this.streamingStatus.set(eventName, true);
        } else if (isEnd) {
            this.streamingStatus.set(eventName, false);
        }
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
            this.updateStreamingStatus(eventName, data);
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
            this.streamingStatus.delete(eventName);
        }
    }

    private cleanupDynamicListeners() {
        if (!this.socket) return;
        this.dynamicEventListeners.forEach((listener, eventName) => {
            this.socket.off(eventName, listener);
        });
        this.dynamicEventListeners.clear();
        this.streamingStatus.clear();
    }

    async emit(eventName: string, data: any, callback?: (response: any) => void): Promise<void> {
        const socket = await this.getSocket();
        if (!socket) {
            console.warn("[SOCKET MANAGER] Cannot emit: No socket available");
            return;
        }

        if (!eventName || typeof eventName !== "string") {
            console.error("[SOCKET MANAGER] Invalid eventName: Must be a non-empty string");
            return;
        }

        if (DEBUG_MODE) {
            console.log(`[SOCKET MANAGER] Emitting event: ${eventName}`, data);
        }

        if (callback && typeof callback === "function") {
            socket.emit(eventName, data, callback);
        } else {
            socket.emit(eventName, data);
        }
    }
}
