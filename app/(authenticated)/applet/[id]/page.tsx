// app/apps/[category]/[subcategory]/page.tsx
import { notFound } from 'next/navigation';

import { AppletViewOne } from './AppletViewOne';
interface AppletPageParams {
    id: string;
}

interface AppletPageProps {
    params: Promise<AppletPageParams>;
}
const TEXT_IDS = ["8255edc9-5170-4f67-8d40-718e77a3561c", "ce63d140-5619-4f4f-9d7d-055f622f887b", "01f7331c-5183-4453-8e0c-9f347c478bfc", "c6926be3-00c7-4e4c-a34f-1bdee86ab01a"];

export default async function AppletPage({ params }: AppletPageProps) {
    const { id } = await params;
    
    
    return (
        <div className="space-y-6">
            <AppletViewOne appletId={id} />
        </div>
    );
}
