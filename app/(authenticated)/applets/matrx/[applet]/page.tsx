// app/(authenticated)/applets/[applet]/page.tsx
import { notFound } from 'next/navigation';

// Import all layouts
import { ToolsLayout } from "@/components/applet/applets/layouts/ToolsLayout";
import { ConversationalLayout } from "@/components/applet/applets/layouts/ConversationalLayout";
import { appletConfigs } from "@/config/applets/index";
import { ListLayout } from "@/components/applet/applets/layouts/ListLayout";
import { GridLayout } from "@/components/applet/applets/layouts/GridLayout";
import { DashboardLayout } from "@/components/applet/applets/layouts/DashboardLayout";
import { AppletConfig, AppletLayoutType } from '@/types/applets/types';

interface AppletPageParams {
    applet: string;
}

interface AppletPageProps {
    params: Promise<AppletPageParams>;
}

const layouts: Record<AppletLayoutType, React.ComponentType<{ config: AppletConfig }>> = {
    toolsLayout: ToolsLayout,
    conversationalLayout: ConversationalLayout,
    dashboardLayout: DashboardLayout,
    gridLayout: GridLayout,
    listLayout: ListLayout,
};

export default async function AppletPage({ params }: AppletPageProps) {
    const { applet } = await params;

    const config = appletConfigs[applet];

    
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