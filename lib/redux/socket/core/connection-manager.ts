// lib/redux/socket/core/connection-manager.ts
'use client'

import { Socket } from "socket.io-client";
import { supabase } from "@/utils/supabase/client";

export interface SocketConfig {
  url: string;
  namespace?: string;
  auth?: Record<string, any>;
  transports?: ("polling" | "websocket")[];
}

export class SocketConnectionManager {
  private static instance: SocketConnectionManager;
  private sockets: Map<string, Socket> = new Map();
  private connectionPromises: Map<string, Promise<Socket>> = new Map();
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

  async getSocket(config: SocketConfig): Promise<Socket | null> {
    if (!this.isClientSide) {
      console.warn("[SOCKET CONNECTION MANAGER] Socket unavailable: Not on client side");
      return null;
    }

    const socketKey = `${config.url}${config.namespace || ""}`;
    const existingSocket = this.sockets.get(socketKey);
    if (existingSocket?.connected) {
      return existingSocket;
    }

    // Clear stale socket if disconnected
    if (existingSocket && !existingSocket.connected) {
      this.sockets.delete(socketKey);
    }

    if (this.connectionPromises.has(socketKey)) {
      return this.connectionPromises.get(socketKey)!;
    }

    const promise = this.connectWithFallback(config);
    this.connectionPromises.set(socketKey, promise);

    try {
      const socket = await promise;
      this.sockets.set(socketKey, socket);
      return socket;
    } catch (error) {
      console.error("[SOCKET CONNECTION MANAGER] All connection attempts failed:", error);
      return null;
    } finally {
      this.connectionPromises.delete(socketKey);
    }
  }

  private async connectWithFallback(config: SocketConfig): Promise<Socket> {
    if (!this.isClientSide) {
      throw new Error("[SOCKET CONNECTION MANAGER] Cannot connect: Not on client side");
    }

    const { namespace = "", auth, transports = ["polling", "websocket"] } = config;
    const resolvedAuth = auth || (await this.getDefaultAuth());
    const urls = this.getConnectionUrls();

    const { io } = await import("socket.io-client");

    for (const url of urls) {
      const socket = io(`${url}${namespace}`, {
        transports,
        withCredentials: true,
        auth: resolvedAuth,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
      });

      try {
        return await new Promise<Socket>((resolve, reject) => {
          socket.on("connect", () => {
            if (DEBUG_MODE) console.log(`[SOCKET CONNECTION MANAGER] Connected to ${url}`);
            resolve(socket);
          });
          socket.on("connect_error", (error: Error) => {
            console.error(`[SOCKET CONNECTION MANAGER] Failed to connect to ${url}:`, error);
            socket.disconnect();
            reject(error);
          });
        });
      } catch (error) {
        // If this wasn’t the last URL, continue to the next one
        if (url !== urls[urls.length - 1]) {
          console.log(`[SOCKET CONNECTION MANAGER] Trying next URL...`);
          continue;
        }
        throw error; // If it’s the last URL, throw the error
      }
    }

    throw new Error("Unreachable: All URLs exhausted"); // Should never happen with production as last fallback
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
    this.connectionPromises.clear();
  }

  private async getDefaultAuth(): Promise<Record<string, any>> {
    const session = await supabase.auth.getSession();
    return { token: session.data.session?.access_token };
  }

  private getConnectionUrls(): string[] {
    const overrideUrl = process.env.NEXT_PUBLIC_SOCKET_OVERRIDE;
    const isProduction = process.env.NODE_ENV === "production";

    const urls: string[] = [];

    // Add override URL first if it exists
    if (overrideUrl) {
      urls.push(overrideUrl);
    }

    // In development, add local URL before production
    if (!isProduction) {
      urls.push(this.DEFAULT_LOCAL_URL);
    }

    // Production URL is always the final fallback
    urls.push(this.DEFAULT_PRODUCTION_URL);

    return urls;
  }

  // Optional: Keep testConnection for debugging or future use
  private async testConnection(url: string): Promise<boolean> {
    if (!this.isClientSide) return false;
    try {
      const { io } = await import("socket.io-client");
      const testSocket = io(url, {
        transports: ["polling", "websocket"],
        timeout: 2000,
        autoConnect: false,
      });
      return new Promise((resolve) => {
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
      console.log("[SOCKET CONNECTION MANAGER] Test connection failed:", url, error);
      return false;
    }
  }
}

// Enable DEBUG_MODE globally if needed
const DEBUG_MODE = true;