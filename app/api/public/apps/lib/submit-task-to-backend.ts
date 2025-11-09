/**
 * Server-side task submission to Python backend
 * 
 * This submits tasks via Socket.IO to the Python backend
 * For public apps that don't have Socket.IO client access
 */

import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://server.app.matrxserver.com';
const SOCKET_NAMESPACE = '/UserSession';

export interface TaskSubmissionParams {
    task_id: string;
    service: string;
    task_name: string;
    task_data: Record<string, any>;
    user_id?: string;
    metadata?: Record<string, any>;
}

export interface TaskSubmissionResult {
    success: boolean;
    task_id: string;
    message?: string;
    error?: string;
}

/**
 * Submit a task to the Python backend via Socket.IO
 * Creates a temporary connection, submits the task, and closes
 */
export async function submitTaskToBackend(params: TaskSubmissionParams): Promise<TaskSubmissionResult> {
    return new Promise((resolve) => {
        let socket: Socket | null = null;
        const timeout = setTimeout(() => {
            if (socket) socket.disconnect();
            resolve({
                success: false,
                task_id: params.task_id,
                error: 'Connection timeout'
            });
        }, 10000); // 10 second timeout

        try {
            // Create Socket.IO connection
            socket = io(`${BACKEND_URL}${SOCKET_NAMESPACE}`, {
                transports: ['websocket', 'polling'],
                reconnection: false,
                timeout: 5000,
            });

            socket.on('connect', () => {
                console.log(`[Public App] Socket connected for task ${params.task_id}`);
                
                // Submit the task
                socket!.emit(
                    params.service,
                    {
                        taskName: params.task_name,
                        taskData: params.task_data,
                    },
                    (response: { response_listener_events?: string[] }) => {
                        clearTimeout(timeout);
                        const eventNames = response?.response_listener_events || [];
                        
                        if (eventNames.length > 0) {
                            console.log(`[Public App] Task ${params.task_id} submitted, listeners: ${eventNames.join(', ')}`);
                            socket!.disconnect();
                            resolve({
                                success: true,
                                task_id: params.task_id,
                                message: 'Task submitted successfully'
                            });
                        } else {
                            console.error(`[Public App] No response listeners for task ${params.task_id}`);
                            socket!.disconnect();
                            resolve({
                                success: false,
                                task_id: params.task_id,
                                error: 'No response listeners received'
                            });
                        }
                    }
                );
            });

            socket.on('connect_error', (error) => {
                clearTimeout(timeout);
                console.error(`[Public App] Socket connection error for task ${params.task_id}:`, error);
                if (socket) socket.disconnect();
                resolve({
                    success: false,
                    task_id: params.task_id,
                    error: `Connection error: ${error.message}`
                });
            });

        } catch (error) {
            clearTimeout(timeout);
            console.error('Error in submitTaskToBackend:', error);
            if (socket) socket.disconnect();
            resolve({
                success: false,
                task_id: params.task_id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}

/**
 * Store task in ai_tasks table
 * This allows polling to retrieve results even if the task submission fails
 */
export async function storeTaskInDatabase(
    supabase: any,
    params: TaskSubmissionParams
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('ai_tasks')
            .insert({
                id: params.task_id,
                service: params.service,
                task_name: params.task_name,
                task_data: params.task_data,
                user_id: params.user_id,
                status: 'pending',
                created_at: new Date().toISOString(),
                metadata: params.metadata,
            });

        if (error) {
            console.error('Failed to store task in database:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error storing task:', error);
        return false;
    }
}

