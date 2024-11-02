// app/(authenticated)/applets/[applet]/page.tsx
import { notFound } from 'next/navigation';
import { AppletConfig, AppletLayoutType } from '@/types/applets/applet-config';

// Import all layouts
import { ToolsLayout } from "@/components/applet/applets/layouts/ToolsLayout";
import { ConversationalLayout } from "@/components/applet/applets/layouts/ConversationalLayout";
import {appletConfigs} from "@/config/applets/index";
import {ListLayout} from "@/components/applet/applets/layouts/ListLayout";
import {GridLayout} from "@/components/applet/applets/layouts/GridLayout";
import {DashboardLayout} from "@/components/applet/applets/layouts/DashboardLayout";

interface AppletPageProps {
    params: {
        applet: string;
    };
}

const layouts: Record<AppletLayoutType, React.ComponentType<{ config: AppletConfig }>> = {
    toolsLayout: ToolsLayout,
    conversationalLayout: ConversationalLayout,
    dashboardLayout: DashboardLayout,
    gridLayout: GridLayout,
    listLayout: ListLayout,
};

export default function AppletPage({ params }: AppletPageProps) {
    const config = appletConfigs[params.applet];

    if (!config) {
        notFound();
    }

    const Layout = layouts[config.layout];

    if (!Layout) {
        console.error(`Layout ${config.layout} not found for applet ${config.key}`);
        return notFound();
    }

    return <Layout config={config} />;
}
