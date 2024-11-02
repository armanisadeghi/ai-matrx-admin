// config/applets/index.tsx
import { toolsConfig } from './tools';
import { aiChatConfig } from './ai-chat';
import { AppletConfig, AppletLayoutType, AppletCategory } from "@/types/applets/applet-config";
import { appletDefinitions } from './applet-definitions';


function getLayoutForCategory(category: AppletCategory): AppletLayoutType {
    switch (category) {
        case 'Communication':
            return 'conversationalLayout';
        case 'AI':
        case 'Automation':
            return 'toolsLayout';
        case 'Data Management':
        case 'Business':
            return 'dashboardLayout';
        case 'Media':
            return 'gridLayout';
        default:
            return 'listLayout';
    }
}


const convertedConfigs = appletDefinitions.reduce<Record<string, AppletConfig>>((acc, applet) => {
    acc[applet.key] = {
        ...applet,
        layout: getLayoutForCategory(applet.category as AppletCategory),
        sections: [],
    };
    return acc;
}, {});

// Merge converted configs with specific configurations
export const appletConfigs: Record<string, AppletConfig> = {
    ...convertedConfigs,
    tools: toolsConfig,
    'ai-chat': aiChatConfig,
};
