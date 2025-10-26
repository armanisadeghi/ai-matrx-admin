// hooks/useToastManager.ts
'use client';

import { useContext } from "react";
import { toast } from "@/lib/toast-service";
import { ToastContext } from "@/providers";
import type { ToastOptions, ToastDefaults } from "@/types";

export const useToastManager = (moduleKey?: string) => {
    const toastContext = useContext(ToastContext);

    return {
        show: (title: string, description: string, variant: any, options?: ToastOptions) =>
            toast.show(title, description, variant, options),
        success: (message?: string, options?: ToastOptions) =>
            toast.success(message, moduleKey, options),
        error: (error?: unknown, options?: ToastOptions) =>
            toast.error(error, moduleKey, options),
        info: (message?: string, options?: ToastOptions) =>
            toast.info(message, moduleKey, options),
        warning: (message?: string, options?: ToastOptions) =>
            toast.warning(message, moduleKey, options),
        notify: (message?: string, options?: ToastOptions) =>
            toast.notify(message, moduleKey, options),
        loading: <T,>(promiseFn: () => Promise<T>, options = {}) =>
            toast.loading(promiseFn, options, moduleKey),
        register: (key: string, defaults: ToastDefaults) =>
            toastContext?.registerDefaults(key, defaults),
        removeDefaults: (key: string) =>
            toastContext?.removeDefaults(key),
        dismiss: (toastId: string) =>
            toast.dismiss(toastId)
    };
};
