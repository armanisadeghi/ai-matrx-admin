import { Socket } from "socket.io-client";

import { SocketConnectionManager } from "./connection-manager";

export class LocalAdminSessionSocket {
    private connectionManager = SocketConnectionManager.getInstance();
    private socket: Socket | null = null;

    async init() {
        this.socket = await this.connectionManager.getSocket({
            url: "http://localhost:8000",
            namespace: "/AdminSession",
            auth: { customToken: "xyz" },
        });
    }

    async emit(eventName: string, data: any) {
        if (!this.socket) await this.init();
        this.socket?.emit(eventName, data);
    }
}

export class ServerAdminSessionSocket {
    private connectionManager = SocketConnectionManager.getInstance();
    private socket: Socket | null = null;

    async init() {
        this.socket = await this.connectionManager.getSocket({
            url: "https://server.app.matrxserver.com",
            namespace: "/AdminSession",
            auth: { customToken: "xyz" },
        });
    }

    async emit(eventName: string, data: any) {
        if (!this.socket) await this.init();
        this.socket?.emit(eventName, data);
    }
}

export class CustomAdminSessionSocket {
    private connectionManager = SocketConnectionManager.getInstance();
    private socket: Socket | null = null;

    async init(url: string, namespace: string, auth: any) {
        this.socket = await this.connectionManager.getSocket({
            url: url,
            namespace: namespace,
            auth: auth,
        });
    }

    async emit(eventName: string, data: any) {
        if (!this.socket) {
            console.error("Socket not initialized. Call init() first with your custom url, namespace, and auth.");
            return;
        }
        this.socket?.emit(eventName, data);
    }
}
