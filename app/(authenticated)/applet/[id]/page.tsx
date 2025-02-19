// app/apps/[category]/[subcategory]/page.tsx
import { notFound } from 'next/navigation';

import { AppletViewOne } from '@/components/applet/applets/AppletViewOne';
import ThemeClassesPreloader from '@/components/mardown-display/ThemeClassesPreloader'; 
interface AppletPageParams {
    id: string;
}

interface AppletPageProps {
    params: Promise<AppletPageParams>;
}

export default async function AppletPage({ params }: AppletPageProps) {
    const { id } = await params;
    
    return (
        <div className="h-full w-full p-2">
            <AppletViewOne appletId={id} />
            <ThemeClassesPreloader />
        </div>
    );
}
