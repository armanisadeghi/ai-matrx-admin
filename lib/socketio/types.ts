
export interface AuthResponse {
    status: 'success' | 'error';
    message: string;
    matrix_id?: string;
}

export interface SocketTaskObject {
    task: string;
    index: number;
    stream: boolean;
    taskData: {
        [key: string]: any;
    };
}

export type SocketTask = SocketTaskObject[];

export interface StartTask {
    (eventName: string, data: SocketTask): void;
}

export type SocketStatus = 'not-connected' | 'idle' | 'connected' | 'authenticated' | 'error' | 'disconnected';
