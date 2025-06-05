interface StatusDisplayProps {
    status?: string;
    className?: string;
}

const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
        case "completed":
            return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
        case "pending":
            return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
        case "running":
            return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
        case "failed":
            return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
        default:
            return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
    }
};

export function StatusDisplay({ status, className = "" }: StatusDisplayProps) {
    if (!status) return null;
    
    return (
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)} ${className}`}>
            {status}
        </div>
    );
} 