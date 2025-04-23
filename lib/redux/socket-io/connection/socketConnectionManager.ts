"use client";
import { supabase } from "@/utils/supabase/client";
import { v4 as uuidv4 } from "uuid";

export interface PredefinedConnection {
  name: string;
  url: string;
  namespace: string;
}

export class SocketConnectionManager {
  private static instance: SocketConnectionManager | null = null;
  private sockets: Map<string, any> = new Map();
  private connectionPromises: Map<string, Promise<any>> = new Map();
  private isClientSide: boolean = typeof window !== "undefined";
  private authToken: string | null = null;
  private connectionAttempts: Map<string, number> = new Map();
  private maxConnectionAttempts: number = 5;
  private connectionDetails: Map<string, { url: string; namespace: string }> = new Map();

  private readonly adminIds = [
    "4cf62e4e-2679-484f-b652-034e697418df",
    "8f7f17ba-935b-4967-8105-7c6b554f41f1",
    "6555aa73-c647-4ecf-8a96-b60e315b6b18",
  ];

  public static readonly DEFAULT_URL = "https://server.app.matrxserver.com";
  public static readonly GPU_SERVER_URL = "https://gpu.app.matrxserver.com";
  public static readonly LOCAL_URL = "http://localhost:8000";
  public static readonly DEFAULT_NAMESPACE = "/UserSession";

  private constructor() {
    if (this.isClientSide) {
      this.startKeepAlive();
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
      { name: 'Production', url: SocketConnectionManager.DEFAULT_URL, namespace: SocketConnectionManager.DEFAULT_NAMESPACE },
      { name: 'GPU Server', url: SocketConnectionManager.GPU_SERVER_URL, namespace: SocketConnectionManager.DEFAULT_NAMESPACE },
      { name: 'Localhost', url: SocketConnectionManager.LOCAL_URL, namespace: SocketConnectionManager.DEFAULT_NAMESPACE },
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
      console.log(`[SOCKET] Attempting connection ${connectionId} to ${url}${namespace}`);
      const socket = io(`${url}${namespace}`, {
        transports: ["websocket", "polling"],
        withCredentials: true,
        auth: { token: this.authToken },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 20000,
      });

      socket.on("connect", () => {
        console.log(`[SOCKET] Connection ${connectionId} connected successfully`);
        this.sockets.set(connectionId, socket);
        this.connectionAttempts.set(connectionId, 0);
        this.connectionPromises.delete(connectionId);
        resolve(socket);
      });

      socket.on("connect_error", (error) => {
        console.log(`[SOCKET] Connection ${connectionId} attempt failed:`, error.message);
        const attempts = (this.connectionAttempts.get(connectionId) || 0) + 1;
        this.connectionAttempts.set(connectionId, attempts);

        if (attempts >= this.maxConnectionAttempts) {
          console.log(`[SOCKET] Max connection attempts reached for ${connectionId}`);
          socket.disconnect();
          this.sockets.delete(connectionId);
          this.connectionPromises.delete(connectionId);
          resolve(null);
        }
      });

      socket.on("disconnect", () => {
        console.log(`[SOCKET] Connection ${connectionId} disconnected`);
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

  private async isLocalServerAvailable(): Promise<boolean> {
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
    const url = isAdmin && (await this.isLocalServerAvailable()) ? SocketConnectionManager.LOCAL_URL : SocketConnectionManager.DEFAULT_URL;
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
      console.log(`[SOCKET] Set primary connection to ${connectionId}`);
    }
  }

  public disconnect(connectionId: string): void {
    const socket = this.sockets.get(connectionId);
    if (socket) {
      socket.disconnect();
      this.sockets.delete(connectionId);
      this.connectionPromises.delete(connectionId);
      this.connectionAttempts.delete(connectionId);
      // Keep connection details in case we need to reconnect
    }
  }

  public async reconnect(connectionId: string): Promise<any> {
    // Check if we have details for this connection
    const details = this.connectionDetails.get(connectionId);
    if (!details) {
      console.log(`[SOCKET] Cannot reconnect, no details found for connection ${connectionId}`);
      return null;
    }

    // Reset connection attempts for this connection
    this.connectionAttempts.set(connectionId, 0);
    
    // Establish a new connection
    console.log(`[SOCKET] Attempting to reconnect ${connectionId} to ${details.url}${details.namespace}`);
    return this.getSocket(connectionId, details.url, details.namespace);
  }

  public deleteConnection(connectionId: string): void {
    // First disconnect if connected
    this.disconnect(connectionId);
    // Then remove the connection details
    this.connectionDetails.delete(connectionId);
  }

  public getUrl(connectionId: string): string {
    return this.connectionDetails.get(connectionId)?.url || SocketConnectionManager.DEFAULT_URL;
  }

  public getNamespace(connectionId: string): string {
    return this.connectionDetails.get(connectionId)?.namespace || SocketConnectionManager.DEFAULT_NAMESPACE;
  }

  public getConnections(): { id: string; url: string; namespace: string }[] {
    const connections: { id: string; url: string; namespace: string }[] = [];
    this.connectionDetails.forEach((details, id) => {
      connections.push({ id, url: details.url, namespace: details.namespace });
    });
    return connections;
  }

  private startKeepAlive(): void {
    setInterval(async () => {
      if (this.authToken && this.isClientSide) {
        try {
          await supabase.auth.getSession();
          console.log("[SOCKET] Session keep-alive successful");
        } catch (error) {
          console.log("[SOCKET] Session keep-alive failed, attempting to refresh token");
          this.authToken = await this.getAuthToken();
        }
      }
    }, 5 * 60 * 1000);
  }
}