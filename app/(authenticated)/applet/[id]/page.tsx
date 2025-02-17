// app/apps/[category]/[subcategory]/page.tsx
import { notFound } from 'next/navigation';

import { AppletViewOne } from './AppletViewOne';
interface AppletPageParams {
    id: string;
}

interface AppletPageProps {
    params: Promise<AppletPageParams>;
}

export default async function AppletPage({ params }: AppletPageProps) {
    const { id } = await params;
    
    
    return (
        <div className="space-y-6">
            <AppletViewOne appletId={id} />
        </div>
    );
}
