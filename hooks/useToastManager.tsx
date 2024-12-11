// hooks/useToastManager.ts
import { useToast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { MatrxVariant } from "@/components/ui/types"
import type { ToastActionElement } from "@/components/ui/toast"

type ShowToastOptions = {
    duration?: number
    action?: {
        label: string
        onClick: () => void
        className?: string
    }
}

type PromiseToastOptions = {
    loading?: string
    success?: string
    error?: string
    duration?: number
}

export const useToastManager = () => {
    const { toast, dismiss } = useToast()

    const showToast = (
        title: string,
        description: string,
        variant: MatrxVariant = "default",
        options?: ShowToastOptions
    ) => {
        const toastAction = options?.action ? (
            <ToastAction
                altText={options.action.label}
                onClick={options.action.onClick}
                className={options.action.className}
            >
                {options.action.label}
            </ToastAction>
        ) as ToastActionElement : undefined

        return toast({
            title,
            description,
            variant,
            duration: options?.duration,
            action: toastAction,
        }).id
    }

    const success = (message: string, options?: ShowToastOptions) => (
        showToast("Success", message, "success", options)
    )

    const error = (error: unknown, options?: ShowToastOptions) => {
        const message = error instanceof Error ? error.message :
                        typeof error === "string" ? error : "An unexpected error occurred"
        return showToast("Error", message, "destructive", options)
    }

    const info = (message: string, options?: ShowToastOptions) => (
        showToast("Info", message, "secondary", options)
    )

    const warning = (message: string, options?: ShowToastOptions) => (
        showToast("Warning", message, "ghost", options)
    )

    const loadingToast = async <T,>(
        promiseFn: () => Promise<T>,
        options: PromiseToastOptions = {}
    ): Promise<T> => {
        const toastId = showToast(
            "Loading",
            options.loading ?? "Loading...",
            "default",
            { duration: Infinity }
        )

        try {
            const result = await promiseFn()
            dismiss(toastId)
            showToast(
                "Success",
                options.success ?? "Operation completed successfully",
                "success",
                { duration: options.duration }
            )
            return result
        } catch (e) {
            dismiss(toastId)
            showToast(
                "Error",
                options.error ?? "Operation failed",
                "destructive",
                { duration: options.duration }
            )
            throw e
        }
    }

    const notify = (message: string, options?: ShowToastOptions) => (
        showToast("Notification", message, "primary", options)
    )

    return {
        show: showToast,
        success,
        error,
        info,
        warning,
        loading: loadingToast,
        notify,
        dismiss: (toastId?: string) => dismiss(toastId)
    } as const
}
