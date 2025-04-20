"use client";

import { logTaskStart } from "./manager-debug";
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

const DEBUG_MODE = false;
const INFO_MODE = false;

export class SocketManager {
    private static instance: SocketManager | null = null;
    private socket: any | null = null;
    private dynamicEventListeners: Map<string, Array<{ listener: (data: any) => void; wrapper: (data: any) => void }>> = new Map();
    private streamingStatus: Map<string, boolean> = new Map();
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
            if (INFO_MODE) console.log("[SOCKET MANAGER] Skipping connection on server-side");
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
            if (INFO_MODE) console.log("[SOCKET MANAGER] Socket unavailable on server-side");
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
            if (INFO_MODE) console.log("[SOCKET MANAGER] Connected");
        });
        this.socket.on("disconnect", () => {
            if (INFO_MODE) console.log("[SOCKET MANAGER] Disconnected");
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
        if (DEBUG_MODE) console.log("-> SocketManager createTask tasks", JSON.stringify(tasks, null, 2));

        const eventNames = await this.startTask(serviceName, tasks, (response) => {
            if (DEBUG_MODE) console.log(`[createTask] Response for service ${serviceName}:`, response);
        });
        if (DEBUG_MODE) console.log("-> SocketManager createTask eventNames", eventNames);

        return eventNames;
    }

    // Updated startTask method with all response types handled
    async startTask(serviceName: string, data: any, callback: (response: any) => void): Promise<string[]> {
        const socket = await this.getSocket();
        if (!socket) return [];
        const sid = socket.id || "pending";
        if (DEBUG_MODE) {
            logTaskStart(serviceName, data, sid);
        }
        return new Promise((resolve) => {
            socket.emit(serviceName, data, (response: { response_listener_events?: string[] }) => {
                let eventNames: string[] = [];
                if (response?.response_listener_events) {
                    eventNames = response.response_listener_events;
                    if (DEBUG_MODE) console.log("--> SocketManager startTask eventNames", eventNames);
                    
                    // Initialize streams in Redux for each event
                    if (this.dispatch) {
                        eventNames.forEach((eventName) => {
                            // Using the new action creator instead of direct dispatch
                            this.dispatch(startStream(eventName));
                        });
                    }
                    
                    eventNames.forEach((eventName: string) => {
                        const listenerLogic = (response: any) => {
                            if (DEBUG_MODE) console.log("--> SocketManager startTask response for event", eventName, response);
                            
                            if (this.dispatch) {
                                if (typeof response === "string") {

                                    this.dispatch(updateStreamText(eventName, response));
                                } else {

                                    if (response?.data !== undefined) {
                                        this.dispatch(updateStreamData(eventName, response.data));
                                    }
                                    if (response?.message !== undefined) {
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
                                        this.dispatch(markStreamEnd(eventName, true));
                                        this.dispatch(completeStream(eventName));
                                    }

                                    // Python needs to have these exact types of emit events

                                    // _send_chunk(text)
                                    // _send_data(data)
                                    // _send_message(message)
                                    // _send_info(info)
                                    // _send_error(error)
                                    // _send_end(end)

                                    // Alternative: use the convenience function to handle all properties at once
                                    // this.dispatch(handleStreamEvent(eventName, response));
                                }
                            }
                            
                            // Original callback logic
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
                                if (DEBUG_MODE) console.log(`[SOCKET MANAGER] Adding listener for new event: ${response.event_name}`);
                                eventNames.push(response.event_name);
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
                            if (DEBUG_MODE) console.warn(`[SOCKET MANAGER] Unexpected response for event ${eventName}:`, response);
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
        let DEBUG_MODE = true;
        for (let index = 0; index < tasks.length; index++) {
            const taskData = tasks[index];
            const singleTaskPayload = [{ ...taskData, index, stream: true }];
            const eventNames = await this.startTask(event, singleTaskPayload, (response) => {
                if (response?.data) onStreamUpdate(index, response.data);
                else if (typeof response === "string") onStreamUpdate(index, response);
                if (DEBUG_MODE) console.log(response);
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
        }
    }

    private cleanupDynamicListeners() {
        if (!this.socket) return;

        this.dynamicEventListeners.forEach((listenerArray, eventName) => {
            this.socket.off(eventName);
        });

        this.dynamicEventListeners.clear();
        this.streamingStatus.clear();

        if (DEBUG_MODE) console.log(`[SOCKET MANAGER] Cleaned up all dynamic listeners`);
    }

    async emit(eventName: string, data: any, callback?: (response: any) => void): Promise<void> {
        const socket = await this.getSocket();
        if (!socket) {
            if (DEBUG_MODE) console.warn("[SOCKET MANAGER] Cannot emit: No socket available");
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
