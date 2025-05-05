"use client";

import { eventChannel, EventChannel } from "redux-saga";
import { SocketConnectionManager, SocketConfig } from "./core/connection-manager";
import { 
    startStream,
    updateStreamText,
    updateStreamData,
    updateStreamMessage,
    updateStreamInfo,
    updateStreamError,
    markStreamEnd,
    completeStream,
    handleStreamEvent
} from './streamingActions';

const DEBUG = false;
const INFO = false;

export class SocketManager {
    private static instance: SocketManager | null = null;
    private socket: any | null = null;
    private dynamicEventListeners: Map<string, Array<{ listener: (data: any) => void; wrapper: (data: any) => void }>> = new Map();
    private streamingStatus: Map<string, boolean> = new Map();
    private activeEventNames: Set<string> = new Set();
    private connectionManager: SocketConnectionManager = SocketConnectionManager.getInstance();
    private isClientSide: boolean = typeof window !== "undefined";
    private dispatch: ((action: any) => void) | null = null;
    private chatActions: any = null;

    
    private config: SocketConfig = {
        url: "",
        namespace: "/UserSession",
    };
    private connectionPromise: Promise<void> | null = null;

    private constructor() {}

    static getInstance(): SocketManager {
        if (!SocketManager.instance) {
            SocketManager.instance = new SocketManager();
        }
        return SocketManager.instance;
    }

    async connect(config?: SocketConfig): Promise<void> {
        if (!this.isClientSide) {
            if (INFO) console.log("[SOCKET MANAGER] Skipping connection on server-side");
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
                this.socket = await this.connectionManager.getSocket(config || this.config);
                if (this.socket) {
                    this.registerEventHandlers();
                }
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
            if (INFO) console.log("[SOCKET MANAGER] Socket unavailable on server-side");
            return null;
        }
        await this.connect();
        return this.socket;
    }

    disconnect() {
        if (this.socket && this.isClientSide) {
            this.cleanupDynamicListeners();
            this.connectionManager.disconnect(this.config);
            this.socket = null;
        }
    }

    setDispatch(dispatch: (action: any) => void) {
        this.dispatch = dispatch;
    }

    setChatActions(chatActions: any) {
        this.chatActions = chatActions;
    }

    private registerEventHandlers() {
        this.socket.on("connect", () => {
            if (INFO) console.log("[SOCKET MANAGER] Connected");
        });
        this.socket.on("disconnect", () => {
            if (INFO) console.log("[SOCKET MANAGER] Disconnected");
        });
        
        // Simple global error handler that forwards errors to all active events
        this.socket.on("global_error", (errorData: any) => {
            this.propagateToAllActiveEvents(errorData);
        });
    }
    
    // Simply propagate any error data to all active events
    private propagateToAllActiveEvents(errorData: any) {
        if (!this.dispatch) return;
        
        this.activeEventNames.forEach(eventId => {
            this.dispatch!(updateStreamError(eventId, errorData));
        });
    }

    isAuthenticated(): boolean {
        return Boolean(this.socket?.auth?.token);
    }

    activeServerUrl(): string {
        return this.socket?.io?.uri?.replace(this.socket?.nsp || "", "") || "";
    }

    activeFullUrl(): string {
        return this.socket?.io?.uri || "";
    }

    activeNamespace(): string {
        return this.socket?.nsp || "";
    }

    createEventChannel(): EventChannel<any> {
        if (!this.isClientSide || !this.socket) {
            return eventChannel(() => () => {});
        }
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

    async createTask(serviceName: string, data: any): Promise<string[]> {
        const socket = await this.getSocket();
        if (!socket) return [];

        const tasks = Array.isArray(data) ? data : [data];

        const eventNames = await this.startTask(serviceName, tasks, (response) => {
            if (DEBUG) console.log(`[createTask] Response for service ${serviceName}:`, response);
        });

        return eventNames;
    }

    async startTask(serviceName: string, data: any, callback: (response: any) => void): Promise<string[]> {
        const socket = await this.getSocket();
        if (!socket) return [];
        const sid = socket.id || "pending";
        return new Promise((resolve) => {
            socket.emit(serviceName, data, (response: { response_listener_events?: string[] }) => {
                let eventNames: string[] = [];
                if (response?.response_listener_events) {
                    eventNames = response.response_listener_events;
                    
                    if (this.dispatch) {
                        eventNames.forEach((eventName) => {
                            // Track active events
                            this.activeEventNames.add(eventName);
                            
                            // Using the new action creator instead of direct dispatch
                            this.dispatch(startStream(eventName));
                        });
                    }
                    
                    eventNames.forEach((eventName: string) => {
                        const listenerLogic = (response: any) => {
                            
                            if (this.dispatch) {
                                if (typeof response === "string") {
                                    this.dispatch(updateStreamText(eventName, response));
                                } else {
                                    if (response?.data !== undefined) {
                                        this.dispatch(updateStreamData(eventName, response.data));
                                    }
                                    if (response?.message !== undefined) {
                                        console.warn("This feature is deprecated, use 'info' instead");
                                        this.dispatch(updateStreamMessage(eventName, response.message));
                                    }
                                    if (response?.info !== undefined) {
                                        this.dispatch(updateStreamInfo(eventName, response.info));
                                    }
                                    if (response?.error !== undefined) {
                                        this.dispatch(updateStreamError(eventName, response.error));
                                    }
                                    
                                    const isEnd = response?.end === true || response?.end === "true" || response?.end === "True";
                                    if (isEnd) {
                                        // Remove from active events when stream ends
                                        this.activeEventNames.delete(eventName);
                                        
                                        this.dispatch(markStreamEnd(eventName, true));
                                        this.dispatch(completeStream(eventName));
                                    }
                                }
                            }
                            
                            if (typeof response === "string") {
                                this.updateStreamingStatus(eventName, response);
                                callback(response);
                                return;
                            }
                            if (response?.data) {
                                this.updateStreamingStatus(eventName, response);
                                callback(response.data);
                                return;
                            }
                            if (response?.action === "add_event" && response?.event_name) {
                                eventNames.push(response.event_name);
                                // Track this new event too
                                this.activeEventNames.add(response.event_name);
                                this.addDynamicEventListener(response.event_name, listenerLogic);
                                this.updateStreamingStatus(eventName, response);
                                return;
                            }
                            // Handle other properties for callback
                            if (response?.message) {
                                callback(response.message);
                                return;
                            }
                            if (response?.info) {
                                callback(response.info);
                                return;
                            }
                            if (response?.error) {
                                callback(response.error);
                                return;
                            }
                            this.updateStreamingStatus(eventName, response);
                        };
                        this.addDynamicEventListener(eventName, listenerLogic);
                    });
                }
                resolve(eventNames);
            });
        });
    }
    
    async startStreamingTasks<T>(event: string, tasks: T[], onStreamUpdate: (index: number, data: string) => void): Promise<string[]> {
        const socket = await this.getSocket();
        if (!socket) return [];
        const eventNames: string[] = [];
        for (let index = 0; index < tasks.length; index++) {
            const taskData = tasks[index];
            const singleTaskPayload = [{ ...taskData, index, stream: true }];
            const eventNames = await this.startTask(event, singleTaskPayload, (response) => {
                if (response?.data) onStreamUpdate(index, response.data);
                else if (typeof response === "string") onStreamUpdate(index, response);
            });
            eventNames.push(...eventNames);
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

    subscribeToEvent(eventName: string, callback: (data: any) => void): () => void {
        return this.addDynamicEventListener(eventName, callback);
    }

    addDynamicEventListener(eventName: string, listener: (data: any) => void): () => void {
        if (!this.socket) return () => {};

        const wrappedListener = (data: any) => {
            this.updateStreamingStatus(eventName, data);
            listener(data);
        };

        if (!this.dynamicEventListeners.has(eventName)) {
            this.dynamicEventListeners.set(eventName, []);

            this.socket.on(eventName, (data: any) => {
                const listeners = this.dynamicEventListeners.get(eventName) || [];
                listeners.forEach((item) => item.wrapper(data));
            });
        }
        const listenerArray = this.dynamicEventListeners.get(eventName)!;
        listenerArray.push({ listener, wrapper: wrappedListener });

        return () => this.removeDynamicEventListener(eventName, listener);
    }

    removeDynamicEventListener(eventName: string, specificListener?: (data: any) => void) {
        if (!this.socket) return;

        const listenerArray = this.dynamicEventListeners.get(eventName);
        if (!listenerArray) return;

        if (specificListener) {
            const index = listenerArray.findIndex((item) => item.listener === specificListener);
            if (index !== -1) {
                listenerArray.splice(index, 1);
            }
        } else {
            listenerArray.length = 0;
        }

        if (listenerArray.length === 0) {
            this.socket.off(eventName);
            this.dynamicEventListeners.delete(eventName);
            this.streamingStatus.delete(eventName);
            // Remove from active events tracking
            this.activeEventNames.delete(eventName);
        }
    }

    private cleanupDynamicListeners() {
        if (!this.socket) return;

        this.dynamicEventListeners.forEach((listenerArray, eventName) => {
            this.socket.off(eventName);
        });

        this.dynamicEventListeners.clear();
        this.streamingStatus.clear();
        // Clear active events tracking
        this.activeEventNames.clear();

        if (DEBUG) console.log(`[SOCKET MANAGER] Cleaned up all dynamic listeners`);
    }

    async emit(eventName: string, data: any, callback?: (response: any) => void): Promise<void> {
        const socket = await this.getSocket();
        if (!socket) {
            return;
        }

        if (!eventName || typeof eventName !== "string") {
            console.error("[SOCKET MANAGER] Invalid eventName: Must be a non-empty string");
            return;
        }

        if (callback && typeof callback === "function") {
            socket.emit(eventName, data, callback);
        } else {
            socket.emit(eventName, data);
        }
    }
}
