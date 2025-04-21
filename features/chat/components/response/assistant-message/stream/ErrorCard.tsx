import React from "react";
import { AlertTriangle, X, RefreshCw, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

interface ErrorCardProps {
    message: string;
    onClose?: () => void;
    onRetry?: () => void;
    onRefresh?: () => void;
}
const ErrorCard = ({ message, onClose, onRetry, onRefresh }: ErrorCardProps) => {
    const router = useRouter();

    const handleRefresh = () => {
        if (!onRetry) {
            router.refresh();
        } else {
            onRetry();
        }
    };

    return (
        <div className="relative w-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl shadow-sm mb-4">
            <div className="p-4 pb-2">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400" />
                    </div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">Error occurred</p>
                        <p className="mt-1 text-xs text-red-700 dark:text-red-300">{message}</p>
                    </div>
                    {onClose && (
                        <div className="ml-4 flex-shrink-0 flex">
                            <button
                                onClick={onClose}
                                className="inline-flex text-red-400 dark:text-red-300 hover:text-red-500 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 rounded-md p-1"
                            >
                                <span className="sr-only">Close</span>
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {(onRetry || onRefresh) && (
                <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 rounded-b-xl flex justify-end gap-2">
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            <RotateCcw className="w-3 h-3 mr-1.5" />
                            Retry
                        </button>
                    )}
                    <button
                        onClick={handleRefresh}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        <RefreshCw className="w-3 h-3 mr-1.5" />
                        Refresh
                    </button>
                </div>
            )}
        </div>
    );
};

export default ErrorCard;
