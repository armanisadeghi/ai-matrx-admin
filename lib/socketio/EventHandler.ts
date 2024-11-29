// utils/socketio/EventHandler.ts

type EventCallback = (data: any) => void;

export class EventHandler {
    private eventCallbacks: Map<string, EventCallback[]> = new Map();

    handleEvent(eventName: string, data: any) {
        const callbacks = this.eventCallbacks.get(eventName) || [];
        callbacks.forEach(callback => callback(data));
    }

    handleError(eventName: string, error: string) {
        const callbacks = this.eventCallbacks.get(`${eventName}_error`) || [];
        callbacks.forEach(callback => callback(error));
    }

    registerCallback(eventName: string, callback: EventCallback) {
        const callbacks = this.eventCallbacks.get(eventName) || [];
        callbacks.push(callback);
        this.eventCallbacks.set(eventName, callbacks);
    }

    unregisterCallback(eventName: string, callback: EventCallback) {
        const callbacks = this.eventCallbacks.get(eventName) || [];
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
            this.eventCallbacks.set(eventName, callbacks);
        }
    }
}
