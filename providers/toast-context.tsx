'use client';

import React, { createContext, useContext, useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { toast } from '@/lib/toast-service';
import { ToastAction } from "@/components/ui/toast";
import type { ToastDefaults } from '@/types';
import type { ToastActionElement } from "@/components/ui/toast";

type ToastContextType = {
    registerDefaults: (key: string, defaults: ToastDefaults) => void;
    getDefaults: (key: string) => ToastDefaults | undefined;
    removeDefaults: (key: string) => void;
};

export const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [configs, setConfigs] = useState<Record<string, ToastDefaults>>({});
    const { toast: showToast, dismiss } = useToast();

    const createToastAction = (options?: any): ToastActionElement | undefined => {
        if (!options?.action) return undefined;

        return (
            <ToastAction
                altText={options.action.label}
                onClick={options.action.onClick}
                className={options.action.className}
            >
                {options.action.label}
            </ToastAction>
        ) as ToastActionElement;
    };

    React.useEffect(() => {
        toast.setFunctions(
            (props: any) => showToast({
                ...props,
                action: props.options ? createToastAction(props.options) : undefined
            }).id,
            dismiss
        );

        return () => {
            toast.setFunctions(() => "", () => {});
        };
    }, [showToast, dismiss]);

    const registerDefaults = (key: string, defaults: ToastDefaults) => {
        setConfigs(prev => ({ ...prev, [key]: defaults }));
        toast.registerDefaults(key, defaults);
    };

    const getDefaults = (key: string) => configs[key];

    const removeDefaults = (key: string) => {
        setConfigs(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        toast.removeDefaults(key);
    };

    return (
        <ToastContext.Provider value={{ registerDefaults, getDefaults, removeDefaults }}>
            {children}
        </ToastContext.Provider>
    );
}
