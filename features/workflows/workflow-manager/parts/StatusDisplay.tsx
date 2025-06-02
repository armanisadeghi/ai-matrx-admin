import { Clock, CheckCircle, XCircle, Settings, Play, Loader } from "lucide-react";

interface StatusDisplayProps {
    status?: string;
    className?: string;
}

const getStatusConfig = (status?: string) => {
    const normalizedStatus = status?.toLowerCase();
    
    switch (normalizedStatus) {
        case undefined:
        case "":
        case "pending":
            return {
                displayText: "Pending",
                icon: Clock,
                colorClass: "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
            };
        case "initialized":
            return {
                displayText: "Initialized",
                icon: Settings,
                colorClass: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
            };
        case "ready_to_execute":
            return {
                displayText: "Ready to Execute",
                icon: Play,
                colorClass: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
            };
        case "executing":
            return {
                displayText: "Executing",
                icon: Loader,
                colorClass: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
            };
        case "execution_complete":
            return {
                displayText: "Execution Complete",
                icon: CheckCircle,
                colorClass: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
            };
        case "execution_failed":
            return {
                displayText: "Execution Failed",
                icon: XCircle,
                colorClass: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
            };
        default:
            return {
                displayText: status,
                icon: null,
                colorClass: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            };
    }
};

export function StatusDisplay({ status, className = "" }: StatusDisplayProps) {
    const { displayText, icon: Icon, colorClass } = getStatusConfig(status);
    
    return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${colorClass} ${className}`}>
            {Icon && <Icon size={14} />}
            <span>{displayText}</span>
        </div>
    );
}