"use client";
import { supabase } from "@/utils/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { PredefinedConnection } from "../socket.types";
import { getAdminUserIds } from "@/config/admin.config";

const DEBUG = false;

export class SocketConnectionManager {
    private static instance: SocketConnectionManager | null = null;
    private sockets: Map<string, any> = new Map();
    private connectionPromises: Map<string, Promise<any>> = new Map();
    private isClientSide: boolean = typeof window !== "undefined";
    private authToken: string | null = null;
    private connectionAttempts: Map<string, number> = new Map();
    private maxConnectionAttempts: number = 5;
    private connectionDetails: Map<string, { url: string; namespace: string }> = new Map();
    private authenticationStatus: Map<string, boolean> = new Map();

    private readonly adminIds = getAdminUserIds();

    public static readonly DEFAULT_URL = "https://server.app.matrxserver.com";
    public static readonly GPU_SERVER_URL = "https://gpu.app.matrxserver.com";
    public static readonly LOCAL_URL = "http://localhost:8000";
    public static readonly DEFAULT_NAMESPACE = "/UserSession";

    private visibilityHandler: (() => void) | null = null;

    private constructor() {
        if (this.isClientSide) {
            this.startKeepAlive();
            this.startVisibilityHandler();
        }
    }

    static getInstance(): SocketConnectionManager {
        if (!SocketConnectionManager.instance) {
            SocketConnectionManager.instance = new SocketConnectionManager();
        }
        return SocketConnectionManager.instance;
    }

    public static getPredefinedConnections(): PredefinedConnection[] {
        return [
            {
                name: "Production (User Session)",
                url: SocketConnectionManager.DEFAULT_URL,
                namespace: SocketConnectionManager.DEFAULT_NAMESPACE,
            },
            {
                name: "Localhost (User Session)",
                url: SocketConnectionManager.LOCAL_URL,
                namespace: SocketConnectionManager.DEFAULT_NAMESPACE,
            },
            { name: "GPU Server", url: SocketConnectionManager.GPU_SERVER_URL, namespace: SocketConnectionManager.DEFAULT_NAMESPACE },
        ];
    }

    public async getAuthToken(): Promise<string | null> {
        if (!this.isClientSide) return null;
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token || null;
            if (!token) {
                console.log("[SOCKET] No auth token available yet, will retry");
            }
            return token;
        } catch (error) {
            console.log("[SOCKET] Error getting auth token, will retry");
            return null;
        }
    }

    public isAuthenticated(connectionId: string): boolean {
        // If we have a socket and it's connected, check if we successfully authenticated
        const socket = this.sockets.get(connectionId);
        if (socket && socket.connected) {
            return this.authenticationStatus.get(connectionId) || false;
        }
        return false;
    }

    public async getSocket(connectionId: string, url: string, namespace: string): Promise<any> {
        if (this.sockets.has(connectionId)) {
            return this.sockets.get(connectionId);
        }

        if (this.connectionPromises.has(connectionId)) {
            return this.connectionPromises.get(connectionId);
        }

        this.connectionDetails.set(connectionId, { url, namespace });

        const connectionPromise = this.establishConnection(connectionId, url, namespace);
        this.connectionPromises.set(connectionId, connectionPromise);
        return connectionPromise;
    }

    private async establishConnection(connectionId: string, url: string, namespace: string): Promise<any> {
        while (!this.isClientSide) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (!this.authToken) {
            this.authToken = await this.getAuthToken();
            while (!this.authToken) {
                this.authToken = await this.getAuthToken();
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }

        const { io } = await import("socket.io-client");
        return new Promise((resolve) => {
            // console.log(`[SOCKET] Attempting connection ${connectionId} to ${url}${namespace}`);
            const socket = io(`${url}${namespace}`, {
                transports: ["websocket", "polling"],
                withCredentials: true,
                auth: { token: this.authToken },
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                timeout: 20000,
            });

            // Set initial auth status to false
            this.authenticationStatus.set(connectionId, false);

            socket.on("connect", () => {
                if (DEBUG) console.log(`[SOCKET] Connection ${connectionId} connected successfully`);
                this.sockets.set(connectionId, socket);
                this.connectionAttempts.set(connectionId, 0);
                this.connectionPromises.delete(connectionId);

                // When connected with a token, we are authenticated
                // Set authentication status to true as we're using a token
                if (this.authToken) {
                    this.authenticationStatus.set(connectionId, true);
                    if (DEBUG) console.log(`[SOCKET] Connection ${connectionId} authenticated with token`);
                }

                resolve(socket);
            });

            // Listen for auth related events
            socket.on("authenticated", () => {
                if (DEBUG) console.log(`[SOCKET] Connection ${connectionId} explicitly authenticated`);
                this.authenticationStatus.set(connectionId, true);
            });

            socket.on("unauthorized", () => {
                if (DEBUG) console.log(`[SOCKET] Connection ${connectionId} unauthorized - token rejected`);
                this.authenticationStatus.set(connectionId, false);
            });

            socket.on("connect_error", (error) => {
                if (DEBUG) console.log(`[SOCKET] Connection ${connectionId} attempt failed:`, error.message);
                this.authenticationStatus.set(connectionId, false);
                const attempts = (this.connectionAttempts.get(connectionId) || 0) + 1;
                this.connectionAttempts.set(connectionId, attempts);

                if (attempts >= this.maxConnectionAttempts) {
                    if (DEBUG) console.log(`[SOCKET] Max connection attempts reached for ${connectionId}`);
                    socket.disconnect();
                    this.sockets.delete(connectionId);
                    this.connectionPromises.delete(connectionId);
                    resolve(null);
                }
            });

            socket.on("disconnect", () => {
                if (DEBUG) console.log(`[SOCKET] Connection ${connectionId} disconnected`);
                this.authenticationStatus.set(connectionId, false);
            });
        });
    }

    public async isAdmin(): Promise<boolean> {
        if (!this.isClientSide) return false;
        try {
            const session = await supabase.auth.getSession();
            const userId = session.data.session?.user?.id;
            return userId ? this.adminIds.includes(userId) : false;
        } catch (error) {
            return false;
        }
    }

    public async isLocalServerAvailable(): Promise<boolean> {
        if (!this.isClientSide) return false;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 500);
            const response = await fetch(`${SocketConnectionManager.LOCAL_URL}/`, {
                method: "HEAD",
                signal: controller.signal,
            });
            clearTimeout(timeout);
            return response.ok;
        } catch {
            return false;
        }
    }

    public async initializePrimaryConnection(): Promise<string> {
        const isAdmin = await this.isAdmin();
        const url =
            isAdmin && (await this.isLocalServerAvailable()) ? SocketConnectionManager.LOCAL_URL : SocketConnectionManager.DEFAULT_URL;
        const connectionId = "primary";
        await this.getSocket(connectionId, url, SocketConnectionManager.DEFAULT_NAMESPACE);
        return connectionId;
    }

    public addConnection(url: string, namespace: string): string {
        const connectionId = uuidv4();
        this.getSocket(connectionId, url, namespace);
        return connectionId;
    }

    public setPrimaryConnection(connectionId: string): void {
        if (this.sockets.has(connectionId)) {
            if (DEBUG) console.log(`[SOCKET] Set primary connection to ${connectionId}`);
        }
    }

    public disconnect(connectionId: string): void {
        const socket = this.sockets.get(connectionId);
        if (socket) {
            socket.disconnect();
            this.sockets.delete(connectionId);
            this.connectionPromises.delete(connectionId);
            this.connectionAttempts.delete(connectionId);
            this.authenticationStatus.set(connectionId, false);
            // Keep connection details in case we need to reconnect
        }
    }

    public async reconnect(connectionId: string): Promise<any> {
        // Check if we have details for this connection
        const details = this.connectionDetails.get(connectionId);
        if (!details) {
            if (DEBUG) console.log(`[SOCKET] Cannot reconnect, no details found for connection ${connectionId}`);
            return null;
        }

        // Refresh the auth token before reconnecting
        this.authToken = await this.getAuthToken();

        // Reset connection attempts for this connection
        this.connectionAttempts.set(connectionId, 0);

        // Establish a new connection
        if (DEBUG) console.log(`[SOCKET] Attempting to reconnect ${connectionId} to ${details.url}${details.namespace}`);
        return this.getSocket(connectionId, details.url, details.namespace);
    }

    public deleteConnection(connectionId: string): void {
        // First disconnect if connected
        this.disconnect(connectionId);
        // Then remove the connection details
        this.connectionDetails.delete(connectionId);
        this.authenticationStatus.delete(connectionId);
    }

    public getUrl(connectionId: string): string {
        return this.connectionDetails.get(connectionId)?.url || SocketConnectionManager.DEFAULT_URL;
    }

    public getNamespace(connectionId: string): string {
        return this.connectionDetails.get(connectionId)?.namespace || SocketConnectionManager.DEFAULT_NAMESPACE;
    }

    public getConnections(): { connectionId: string; url: string; namespace: string; isAuthenticated: boolean }[] {
        const connections: { connectionId: string; url: string; namespace: string; isAuthenticated: boolean }[] = [];
        this.connectionDetails.forEach((details, connectionId) => {
            connections.push({
                connectionId,
                url: details.url,
                namespace: details.namespace,
                isAuthenticated: this.isAuthenticated(connectionId),
            });
        });
        return connections;
    }

    /**
     * Check if a specific connection (or any connection) is healthy
     */
    public isConnectionHealthy(connectionId?: string): boolean {
        if (connectionId) {
            const socket = this.sockets.get(connectionId);
            return !!(socket && socket.connected);
        }
        // Check primary connection
        const primarySocket = this.sockets.get("primary");
        return !!(primarySocket && primarySocket.connected);
    }

    /**
     * Force immediate reconnection of all sockets (useful after tab regains focus)
     */
    public async forceReconnectAll(): Promise<void> {
        const reconnectPromises: Promise<any>[] = [];

        this.sockets.forEach((socket, connectionId) => {
            if (socket && !socket.connected) {
                console.log(`[SOCKET] Force reconnecting ${connectionId} after visibility change`);
                reconnectPromises.push(this.reconnect(connectionId));
            }
        });

        if (reconnectPromises.length > 0) {
            await Promise.allSettled(reconnectPromises);
        }
    }

    /**
     * Handle visibility changes to reconnect sockets immediately when tab regains focus
     */
    private startVisibilityHandler(): void {
        if (typeof document === "undefined") return;

        this.visibilityHandler = () => {
            if (document.visibilityState === "visible") {
                // Tab became visible - immediately check and reconnect all sockets
                this.sockets.forEach((socket, connectionId) => {
                    if (socket && !socket.connected) {
                        console.log(`[SOCKET] Tab visible - reconnecting ${connectionId}`);
                        socket.connect(); // Immediate reconnect attempt
                    } else if (socket && socket.connected) {
                        // Socket still connected - send a ping to verify
                        socket.emit("ping", { timestamp: Date.now() });
                    }
                });
            }
        };

        document.addEventListener("visibilitychange", this.visibilityHandler);
    }

    private startKeepAlive(): void {
        // Existing Supabase session keep-alive
        setInterval(async () => {
            if (this.authToken && this.isClientSide) {
                try {
                    await supabase.auth.getSession();
                    if (DEBUG) console.log("[SOCKET] Session keep-alive successful");
                } catch (error) {
                    if (DEBUG) console.log("[SOCKET] Session keep-alive failed, attempting to refresh token");
                    this.authToken = await this.getAuthToken();
                }
            }
        }, 5 * 60 * 1000);

        // Socket connection keep-alive ping - aggressive interval to prevent
        // background tab disconnection during long-running operations
        setInterval(() => {
            this.sockets.forEach((socket, connectionId) => {
                if (socket && socket.connected) {
                    socket.emit("ping", { timestamp: Date.now() });
                    if (DEBUG) console.log(`[SOCKET] Sent keep-alive ping to ${connectionId}`);
                }
            });
        }, 25 * 1000); // Every 25 seconds (was 15 minutes)
    }
}
