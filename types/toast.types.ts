// types/toast.ts
export type ToastDefaults = {
    success?: string;
    error?: string;
    info?: string;
    warning?: string;
    loading?: string;
    notify?: string;
}

export type ToastOptions = {
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
        className?: string;
    };
    // Add className for styling control
    className?: string;
};