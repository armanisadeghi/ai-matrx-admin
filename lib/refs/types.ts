// lib/refs/types.ts
export type RefMethod = (...args: any[]) => void;

export interface RefCollection {
    [componentId: string]: {
        [methodName: string]: RefMethod;
    };
}

export interface RefManagerMethods {
    call: <T extends any[]>(componentId: string, methodName: string, ...args: T) => void;
    broadcast: <T extends any[]>(methodName: string, ...args: T) => void;
    hasMethod: (componentId: string, methodName: string) => boolean;
    register: (componentId: string, methods: { [key: string]: RefMethod }) => void;
    unregister: (componentId: string) => void;
}
