// lib/redux/socket/manager.ts
import { SagaCoordinator } from "@/lib/redux/sagas/SagaCoordinator";
import { supabase } from "@/utils/supabase/client";
import { logTaskStart, logFallbackResponse, logFallbackData, logTaskConfirmed, logDirectResponse } from "./manager-debug";

const DEBUG_MODE = false;

export class SocketManager {
    private static instance: SocketManager;
    private socket: any | null = null;
    private dynamicEventListeners: Map<string, (data: any) => void> = new Map();
    private readonly PRODUCTION_URL = "https://server.app.matrxserver.com";
    private readonly LOCAL_URL = "http://localhost:8000";

    protected constructor() {}

    static getInstance(): SocketManager {
        if (!SocketManager.instance) {
            SocketManager.instance = new SocketManager();
        }
        return SocketManager.instance;
    }

    private async getSocketAddress(): Promise<string> {
        if (process.env.NEXT_PUBLIC_SOCKET_OVERRIDE) {
            return process.env.NEXT_PUBLIC_SOCKET_OVERRIDE;
        }
        if (process.env.NODE_ENV === "production") {
            return this.PRODUCTION_URL;
        }
        try {
            const testSocket = await fetch(this.LOCAL_URL, {
                method: "HEAD",
                signal: AbortSignal.timeout(2000),
            });
            if (testSocket.ok) {
                return this.LOCAL_URL;
            }
        } catch (error) {
            console.log("[SOCKET MANAGER] Local server not available, falling back to production URL");
        }
        return this.PRODUCTION_URL;
    }

    async connect() {
        if (!this.socket) {
            if (typeof window !== "undefined") {
                try {
                    const { io } = await import("socket.io-client");
                    const socketAddress = await this.getSocketAddress();
                    const session = await supabase.auth.getSession();
                    this.socket = io(`${socketAddress}/UserSession`, {
                        transports: ["polling", "websocket"],
                        withCredentials: true,
                        auth: {
                            token: session.data.session.access_token,
                        },
                    });
                    this.socket.on("connect_error", (error: Error) => {
                        console.log("[SOCKET MANAGER] Socket connection error:", error.message);
                    });
                    this.registerEventHandlers();
                    console.log(`[SOCKET MANAGER] Connected to ${socketAddress}/UserSession`);
                } catch (error) {
                    console.error("[SOCKET MANAGER] Error connecting socket", error);
                }
            } else {
                console.log("[SOCKET MANAGER] window is undefined, skipping socket connection");
            }
        }
    }

    disconnect() {
        if (this.socket) {
            this.cleanupDynamicListeners();
            this.socket.disconnect();
            this.socket = null;
        }
    }

    getSocket(): any {
        if (!this.socket) {
            throw new Error("Socket is not initialized. Call connect() first.");
        }
        return this.socket;
    }

    private registerEventHandlers() {
        const sagaCoordinator = SagaCoordinator.getInstance();
        const socket = this.getSocket();
        socket.on("connect", () => {});
        socket.on("disconnect", () => {});
        socket.onAny((eventName: string, ...args: any[]) => {
            sagaCoordinator.emitSocketEvent({ eventName, args });
        });
    }

    startTask(eventName: string, data: any, callback: (response: any) => void) {
        const socket = this.getSocket();
        if (!socket || !socket.connected) {
            if (DEBUG_MODE) {
                console.error("[SOCKET MANAGER] Socket not initialized or not connected");
            }
            return;
        }

        const sid = socket.id;
        const taskName = data[0]?.task;

        if (!taskName) {
            console.error("[SOCKET MANAGER] Request Data did not contain a task name. Data:", data);
            return;
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
                    callback(finalResponse.data);
                });
            }
        });
    }

    startStreamingTasks<T>(event: string, tasks: T[], onStreamUpdate: (index: number, data: string) => void) {
        tasks.forEach((taskData, index) => {
            const singleTaskPayload = [
                {
                    ...taskData,
                    index,
                    stream: true,
                },
            ];
            this.startTask(event, singleTaskPayload, (response) => {
                console.log("[SOCKET MANAGER] Streaming response:", response);
                if (response?.data) {
                    onStreamUpdate(index, response.data);
                    console.log("[SOCKET MANAGER] Streaming response Data:", response.data);
                } else if (typeof response === "string") {
                    onStreamUpdate(index, response);
                }
            });
        });
    }

    createTask(eventName: string, data: any): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const socket = this.getSocket();
            if (!socket || !socket.connected) {
                reject(new Error("Socket not initialized or not connected"));
                return;
            }
    
            const sid = socket.id;
            const eventNames: string[] = [];
    
            if (Array.isArray(data)) {
                data.forEach((taskData, index) => {
                    const taskName = taskData?.task;
                    if (!taskName) {
                        console.error("[SOCKET MANAGER] Task name not found");
                        return;
                    }
                    const taskIndex = taskData?.index ?? index;
                    const defaultEventName = `${sid}_${taskName}_${taskIndex}`;
                    eventNames.push(defaultEventName);
                });
            } else {
                const taskName = data?.task;
                if (!taskName) {
                    console.error("[SOCKET MANAGER] Task name not found");
                    return;
                }
                const taskIndex = data?.index ?? 0;
                const defaultEventName = `${sid}_${taskName}_${taskIndex}`;
                eventNames.push(defaultEventName);
            }
    
            socket.emit(eventName, data, () => {
                resolve(eventNames);
            });
        });
    }

    subscribeToEvent(eventName: string, callback: (data: any) => void): () => void {
        this.addDynamicEventListener(eventName, callback);
        return () => {
            this.removeDynamicEventListener(eventName);
        };
    }

    addDynamicEventListener(eventName: string, listener: (data: any) => void) {
        const socket = this.getSocket();
        if (!socket) {
            console.error("[SOCKET MANAGER] Socket not initialized");
            return;
        }
        if (this.dynamicEventListeners.has(eventName)) {
            console.log(`[SOCKET MANAGER] Listener already exists for event: ${eventName}`);
            return;
        }
        const wrappedListener = (data: any) => {
            listener(data);
        };
        socket.on(eventName, wrappedListener);
        this.dynamicEventListeners.set(eventName, wrappedListener);
        console.log(`[SOCKET MANAGER] Dynamic listener added for event: ${eventName}`);
    }

    removeDynamicEventListener(eventName: string) {
        const socket = this.getSocket();
        if (!socket) {
            console.error("[SOCKET MANAGER] Socket not initialized");
            return;
        }
        const listener = this.dynamicEventListeners.get(eventName);
        if (listener) {
            socket.off(eventName, listener);
            this.dynamicEventListeners.delete(eventName);
            console.log(`[SOCKET MANAGER] Dynamic listener removed for event: ${eventName}`);
        }
    }

    listenForResponse(eventName: string, taskIndex: number, callback: (data: any) => void) {
        const socket = this.getSocket();
        if (!socket) {
            console.error("[SOCKET MANAGER] Socket is not initialized");
            return;
        }
        const sid = socket.id;
        const dynamicEventName = `${sid}_${eventName}_${taskIndex}`;
        socket.on(dynamicEventName, (data: any) => {
            console.log(`[SOCKET MANAGER] Received response for event: ${dynamicEventName}`, data);
            callback(data);
        });
        console.log(`[SOCKET MANAGER] Listening for response on event: ${dynamicEventName}`);
    }

    emit(event: string, data: any) {
        const socket = this.getSocket();
        console.log(`[SOCKET MANAGER] Emitting event ${event} with data:`, data);
        socket.emit(event, data);
    }

    cleanupDynamicListeners() {
        const socket = this.getSocket();
        if (!socket) {
            console.error("[SOCKET MANAGER] Socket not initialized");
            return;
        }
        this.dynamicEventListeners.forEach((listener, eventName) => {
            socket.off(eventName, listener);
            console.log(`[SOCKET MANAGER] Dynamic listener cleaned up for event: ${eventName}`);
        });
        this.dynamicEventListeners.clear();
    }
}
