"use client";

import { Socket } from "socket.io-client";
import { supabase } from "@/utils/supabase/client";

export interface SocketConfig {
    url: string;
    namespace?: string;
    auth?: Record<string, any>;
    transports?: ("polling" | "websocket")[];
}

// List of admin user IDs who can access local server in production
const ADMIN_USER_IDS = [
    "4cf62e4e-2679-484f-b652-034e697418df",
    "8f7f17ba-935b-4967-8105-7c6b554f41f1",
    "6555aa73-c647-4ecf-8a96-b60e315b6b18",
];

export class SocketConnectionManager {
    private static instance: SocketConnectionManager;
    private sockets: Map<string, Socket> = new Map();
    private pendingConnections: Map<string, Promise<Socket>> = new Map();
    private isClientSide: boolean = typeof window !== "undefined";
    private readonly DEFAULT_PRODUCTION_URL = "https://server.app.matrxserver.com";
    private readonly DEFAULT_LOCAL_URL = "http://localhost:8000";

    private constructor() {}

    static getInstance(): SocketConnectionManager {
        if (!SocketConnectionManager.instance) {
            SocketConnectionManager.instance = new SocketConnectionManager();
        }
        return SocketConnectionManager.instance;
    }

    async getSocket(config: SocketConfig): Promise<Socket> {
        const socketKey = `${config.url}${config.namespace || ""}`;
        const existingSocket = this.sockets.get(socketKey);
        if (existingSocket?.connected) {
            return existingSocket;
        }

        if (this.pendingConnections.has(socketKey)) {
            return this.pendingConnections.get(socketKey)!;
        }

        if (existingSocket && !existingSocket.connected) {
            this.sockets.delete(socketKey);
        }

        const urls = await this.getPrioritizedUrls(config.url);
        const connectionPromise = this.connectWithFallback({ ...config, url: urls[0] }, urls.slice(1), socketKey);
        this.pendingConnections.set(socketKey, connectionPromise);

        try {
            const socket = await connectionPromise;
            this.sockets.set(socketKey, socket);
            return socket;
        } finally {
            this.pendingConnections.delete(socketKey);
        }
    }

    public async getPrioritizedUrls(baseUrl: string): Promise<string[]> {
        if (baseUrl) return [baseUrl];
        const overrideUrl = process.env.NEXT_PUBLIC_SOCKET_OVERRIDE;
        const isProduction = process.env.NODE_ENV === "production";
        const urls: string[] = [];

        if (overrideUrl) {
            urls.push(overrideUrl);
        }

        // Always add production URL first in production environment
        if (isProduction) {
            urls.push(this.DEFAULT_PRODUCTION_URL);
        }

        // Check if current user is an admin
        const isAdmin = await this.isUserAdmin();

        // For non-production or admin users, check if local server is available
        if (!isProduction || isAdmin) {
            const isLocalAvailable = await this.isLocalServerAvailable();
            if (isLocalAvailable) {
                urls.push(this.DEFAULT_LOCAL_URL);
            }
        }

        // If in non-production and we haven't added production URL yet, add it as fallback
        if (!isProduction && !urls.includes(this.DEFAULT_PRODUCTION_URL)) {
            urls.push(this.DEFAULT_PRODUCTION_URL);
        }

        return urls;
    }

    private async isUserAdmin(): Promise<boolean> {
        if (!this.isClientSide) return false;
        
        try {
            const session = await supabase.auth.getSession();
            const userId = session.data.session?.user?.id;
            
            if (!userId) return false;
            
            return ADMIN_USER_IDS.includes(userId);
        } catch (error) {
            console.error("[SOCKET] Error checking admin status:", error);
            return false;
        }
    }

    private async isLocalServerAvailable(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 500);
            const response = await fetch(`${this.DEFAULT_LOCAL_URL}/`, {
                method: "HEAD",
                signal: controller.signal,
            });
            clearTimeout(timeout);
            return response.ok;
        } catch {
            return false;
        }
    }

    private async connectWithFallback(config: SocketConfig, fallbackUrls: string[], socketKey: string): Promise<Socket> {
        const { url, namespace = "", auth, transports = ["polling", "websocket"] } = config;
        const resolvedAuth = auth || (await this.getDefaultAuth());

        const { io } = await import("socket.io-client");
        const socket = io(`${url}${namespace}`, {
            transports,
            withCredentials: true,
            auth: resolvedAuth,
            reconnection: false,
        });

        return new Promise((resolve, reject) => {
            socket.on("connect", () => {
                if (DEBUG_MODE) console.log(`[SOCKET] Connected to ${url}`);
                resolve(socket);
            });
            socket.on("connect_error", async () => {
                socket.disconnect();
                if (fallbackUrls.length > 0) {
                    const nextConfig = { ...config, url: fallbackUrls[0] };
                    resolve(this.connectWithFallback(nextConfig, fallbackUrls.slice(1), socketKey));
                } else {
                    reject(new Error("[SOCKET] All connection attempts failed"));
                }
            });
        });
    }

    disconnect(config: SocketConfig) {
        if (!this.isClientSide) return;
        const socketKey = `${config.url}${config.namespace || ""}`;
        const socket = this.sockets.get(socketKey);
        if (socket) {
            socket.disconnect();
            this.sockets.delete(socketKey);
        }
    }

    disconnectAll() {
        if (!this.isClientSide) return;
        this.sockets.forEach((socket) => socket.disconnect());
        this.sockets.clear();
        this.pendingConnections.clear();
    }

    private async getDefaultAuth(): Promise<Record<string, any>> {
        const session = await supabase.auth.getSession();
        return { token: session.data.session?.access_token };
    }
}

const DEBUG_MODE = true;
