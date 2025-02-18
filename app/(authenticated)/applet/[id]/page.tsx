// app/apps/[category]/[subcategory]/page.tsx
import { notFound } from 'next/navigation';

import { AppletViewOne } from '@/components/applet/applets/AppletViewOne';
import { APPLET_THEMES, AppletThemeName } from '@/components/brokers/main-layouts/applet-themes';
interface AppletPageParams {
    id: string;
}

interface AppletPageProps {
    params: Promise<AppletPageParams>;
}

export default async function AppletPage({ params }: AppletPageProps) {
    const { id } = await params;
    const allThemes = APPLET_THEMES;
    
    return (
        <div className="h-full w-full p-2">
            <AppletViewOne appletId={id} allThemes={allThemes} />
        </div>
    );
}
