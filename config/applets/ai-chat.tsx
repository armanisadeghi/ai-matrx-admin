// config/applets/ai-chat.ts
import { AppletConfig } from "@/types/applets/types";
import {
    IconMessage,
    IconBrain,
    IconHistory,
    IconSettings,
    IconBookmark,
} from "@tabler/icons-react";

export const aiChatConfig: AppletConfig = {
    key: 'ai-chat',
    title: 'AI Chat',
    description: 'Engage with advanced AI models in natural conversations',
    icon: <IconMessage className="w-10 h-10" />,
    layout: 'conversationalLayout',
    category: 'AI',
    stats: [
        {
            id: 'active-chats',
            label: 'Active Chats',
            value: 3,
            icon: <IconMessage className="w-4 h-4" />
        },
        {
            id: 'saved-threads',
            label: 'Saved Threads',
            value: 12,
            icon: <IconBookmark className="w-4 h-4" />
        }
    ],
    sections: [
        {
            id: 'new-chat',
            title: 'New Chat',
            description: 'Start a new conversation with AI',
            icon: <IconMessage className="w-6 h-6" />,
            link: '/applets/ai-chat/new',
            category: 'core',
        },
        {
            id: 'chat-history',
            title: 'History',
            description: 'View past conversations',
            icon: <IconHistory className="w-6 h-6" />,
            link: '/applets/ai-chat/history',
            category: 'feature',
        },
        {
            id: 'chat-settings',
            title: 'Settings',
            description: 'Configure AI models and preferences',
            icon: <IconSettings className="w-6 h-6" />,
            link: '/applets/ai-chat/settings',
            category: 'feature',
        }
    ]
};

