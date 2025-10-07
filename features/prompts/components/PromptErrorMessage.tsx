import { AlertCircle } from "lucide-react";

interface PromptErrorMessageProps {
    message: string;
}

export function PromptErrorMessage({ message }: PromptErrorMessageProps) {
    return (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
            <span className="text-xs font-medium text-red-700 dark:text-red-300 leading-4">
                {message}
            </span>
        </div>
    );
}