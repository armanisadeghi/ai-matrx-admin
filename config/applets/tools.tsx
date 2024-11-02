// config/applets/old-tools.ts
import { AppletConfig, ToolEntityConfig } from "@/types/applets/types";
import {
    IconFunction,
    IconSettings,
    IconBrandOpenai,
    IconApi,
    IconPuzzle,
    IconArrowsShuffle,
    IconCode,
    IconDatabase,
    IconWand
} from "@tabler/icons-react";

export const toolsConfig: AppletConfig = {
    key: 'tools',
    title: 'Tools',
    description: 'Manage functions, APIs, and integrations',
    icon: <IconDatabase className="w-10 h-10" />,
    layout: 'toolsLayout',
    category: 'Automation',
    stats: [
        {
            id: 'total-functions',
            label: 'Total Functions',
            value: 156,
            icon: <IconFunction className="w-4 h-4" />
        },
        {
            id: 'active-integrations',
            label: 'Active Integrations',
            value: 23,
            icon: <IconPuzzle className="w-4 h-4" />
        },
        {
            id: 'connected-apis',
            label: 'Connected APIs',
            value: 12,
            icon: <IconApi className="w-4 h-4" />
        }
    ],
    categories: [
        {
            id: 'core',
            title: 'Core Tools',
            description: 'Essential old-tools and functions'
        },
        {
            id: 'connection',
            title: 'Connected Features',
            description: 'Integrations with other applets'
        }
    ],
    sections: [
        {
            id: 'registered-functions',
            title: 'Registered Functions',
            description: 'Custom functions registered in the system for use in workflows and automations',
            icon: <IconFunction className="w-6 h-6" />,
            link: '/applets/old-tools/registered-functions',
            category: 'core',
            count: 24
        },
        {
            id: 'system-functions',
            title: 'System Functions',
            description: 'Built-in system functions providing core functionality',
            icon: <IconSettings className="w-6 h-6" />,
            link: '/applets/old-tools/system-functions',
            category: 'core',
            badge: 'System'
        },
        {
            id: 'args',
            title: 'Arguments',
            description: 'Manage function arguments and parameters',
            icon: <IconCode className="w-6 h-6" />,
            link: '/applets/old-tools/args',
            category: 'core'
        },
        {
            id: 'ai-tools',
            title: 'AI Tools',
            description: 'Artificial Intelligence old-tools and model integrations',
            icon: <IconBrandOpenai className="w-6 h-6" />,
            link: '/applets/old-tools/ai-old-tools',
            category: 'core',
            badge: 'AI'
        },
        {
            id: 'apis',
            title: 'APIs',
            description: 'External API connections and configurations',
            icon: <IconApi className="w-6 h-6" />,
            link: '/applets/old-tools/apis',
            category: 'core'
        },
        {
            id: 'integrations',
            title: 'Integrations',
            description: 'Third-party service integrations and plugins',
            icon: <IconPuzzle className="w-6 h-6" />,
            link: '/applets/old-tools/integrations',
            category: 'core'
        },
        // Connected Features
        {
            id: 'return-brokers',
            title: 'Return Brokers',
            description: 'Data brokers for handling function returns and data flow',
            icon: <IconArrowsShuffle className="w-6 h-6" />,
            link: '/applets/old-tools/return-brokers',
            category: 'connection'
        },
        {
            id: 'recipe-functions',
            title: 'Recipe Functions',
            description: 'Functions that power workflow recipes',
            icon: <IconWand className="w-6 h-6" />,
            link: '/applets/old-tools/recipe-functions',
            category: 'connection',
            badge: 'Recipes'
        }
    ]
};


export const toolEntities: ToolEntityConfig[] = [
    {
        id: 'registered-functions',
        entityKey: 'registeredFunction',
        title: 'Registered Functions',
        description: 'Custom functions registered in the system for use in workflows and automations',
        icon: <IconFunction className="w-6 h-6" />,
        category: 'core',
        count: 24
    },
    {
        id: 'system-functions',
        entityKey: 'systemFunction',
        title: 'System Functions',
        description: 'Built-in system functions providing core functionality',
        icon: <IconSettings className="w-6 h-6" />,
        category: 'core',
        badge: 'System'
    },
    {
        id: 'args',
        entityKey: 'arg',
        title: 'Function Arguments',
        description: 'Manage function arguments and parameters',
        icon: <IconCode className="w-6 h-6" />,
        category: 'core'
    },
];
