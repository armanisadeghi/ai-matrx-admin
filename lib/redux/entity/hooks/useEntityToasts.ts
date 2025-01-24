import { MatrxVariant } from "@/components/ui/types";
import { toast } from "@/components/ui/use-toast";
import { EntityKeys } from "@/types/entityTypes";

interface ToastOptions {
    showToast?: boolean;
    customMessage?: string;
}

export const useEntityToasts = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    const getEntityName = () => {
        return entityKey.charAt(0).toUpperCase() + entityKey.slice(1).toLowerCase();
    };

    const showToast = (
        title: string,
        description: string,
        variant: MatrxVariant = "default",
        options?: ToastOptions
    ) => {
        if (options?.showToast === false) return;

        toast({
            title,
            description: options?.customMessage || description,
            variant,
            duration: 3000, // 3 seconds
        });
    };

    const handleCreateSuccess = (options?: ToastOptions) => {
        showToast(
            "Created",
            `New ${getEntityName()} created successfully`,
            "success",
            options
        );
    };

    const handleUpdateSuccess = (options?: ToastOptions) => {
        showToast(
            "Updated",
            `${getEntityName()} updated successfully`,
            "success",
            options
        );
    };

    const handleDeleteSuccess = (options?: ToastOptions) => {
        showToast(
            "Deleted",
            `${getEntityName()} deleted successfully`,
            "success",
            options
        );
    };

    const handleCustomSuccess = (message: string, options?: Omit<ToastOptions, 'customMessage'>) => {
        showToast(
            "Success",
            message,
            "success",
            { ...options, customMessage: message }
        );
    };

    const handleError = (error: any, operation: string, options?: ToastOptions) => {
        showToast(
            "Error",
            error?.message || `Failed to ${operation} ${getEntityName()}`,
            "destructive",
            options
        );
    };

    return {
        handleCreateSuccess,
        handleUpdateSuccess,
        handleDeleteSuccess,
        handleCustomSuccess,
        handleError,
    };
};