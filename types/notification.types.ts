export interface Notification {
    id: string;
    title: string;
    message: string;
    link?: string;
    icon?: React.ReactNode;
    timestamp: string;
    type: "success" | "error" | "warning" | "info";
    isRead?: boolean;
}

export interface NotificationDropdownProps {
    notifications: Notification[];
    onMarkAsRead?: (id: string) => void;
    onMarkAllAsRead?: () => void;
    onClearAll?: () => void;
    onNotificationClick?: (notification: Notification) => void;
}
