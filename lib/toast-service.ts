// lib/toast-service.ts
import { MatrxVariant } from "@/components/ui/types";
import type { ToastDefaults, ToastOptions } from "@/types";

const DEFAULT_MESSAGES = {
    success: "Operation completed successfully",
    error: "An error occurred",
    info: "Information",
    warning: "Warning",
    notify: "Notification",
    loading: "Loading..."
} as const;

class ToastService {
    private static instance: ToastService;
    private toastFn: ((props: any) => string) | null = null;
    private dismissFn: ((toastId: string) => void) | null = null;
    private defaults: Record<string, ToastDefaults> = {};

    private constructor() {}

    public static getInstance(): ToastService {
        if (!ToastService.instance) {
            ToastService.instance = new ToastService();
        }
        return ToastService.instance;
    }

    public setFunctions(toastFn: (props: any) => string, dismissFn: (toastId: string) => void) {
        this.toastFn = toastFn;
        this.dismissFn = dismissFn;
    }

    public registerDefaults(key: string, defaults: ToastDefaults) {
        this.defaults[key] = defaults;
    }

    public removeDefaults(key: string) {
        delete this.defaults[key];
    }

    private getDefaultMessage(type: keyof typeof DEFAULT_MESSAGES, moduleKey?: string): string {
        return moduleKey && this.defaults[moduleKey]?.[type] || DEFAULT_MESSAGES[type];
    }

    public show(
        title: string,
        description: string,
        variant: MatrxVariant = "default",
        options?: ToastOptions
    ) {
        if (!this.toastFn) {
            console.warn("Toast function not initialized. Make sure ToastProvider is mounted.");
            return "";
        }

        return this.toastFn({
            title,
            description,
            variant,
            duration: options?.duration,
            options
        });
    }

    public success(message?: string, moduleKey?: string, options?: ToastOptions) {
        return this.show("Success", message ?? this.getDefaultMessage("success", moduleKey), "success", options);
    }

    public error(error?: unknown, moduleKey?: string, options?: ToastOptions) {
        const message = error instanceof Error ? error.message :
                        typeof error === "string" ? error : this.getDefaultMessage("error", moduleKey);
        return this.show("Error", message, "destructive", options);
    }

    public info(message?: string, moduleKey?: string, options?: ToastOptions) {
        return this.show("Info", message ?? this.getDefaultMessage("info", moduleKey), "secondary", options);
    }

    public warning(message?: string, moduleKey?: string, options?: ToastOptions) {
        return this.show("Warning", message ?? this.getDefaultMessage("warning", moduleKey), "ghost", options);
    }

    public notify(message?: string, moduleKey?: string, options?: ToastOptions) {
        return this.show("Notification", message ?? this.getDefaultMessage("notify", moduleKey), "primary", options);
    }

    public async loading<T>(
        promiseFn: () => Promise<T>,
        options: { loading?: string; success?: string; error?: string; duration?: number } = {},
        moduleKey?: string
    ): Promise<T> {
        const toastId = this.show(
            "Loading",
            options.loading ?? this.getDefaultMessage("loading", moduleKey),
            "default",
            { duration: Infinity }
        );

        try {
            const result = await promiseFn();
            this.dismissFn?.(toastId);
            this.success(options.success, moduleKey, { duration: options.duration });
            return result;
        } catch (e) {
            this.dismissFn?.(toastId);
            this.error(options.error ?? e, moduleKey, { duration: options.duration });
            throw e;
        }
    }

    public dismiss(toastId: string) {
        this.dismissFn?.(toastId);
    }
}

export const toast = ToastService.getInstance();
