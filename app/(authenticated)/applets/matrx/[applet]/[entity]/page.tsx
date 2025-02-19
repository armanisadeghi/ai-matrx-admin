// app/(authenticated)/applets/[applet]/[entity]/page.tsx

import {toolEntities} from '@/config/applets/tools';
import {notFound} from 'next/navigation';
import {EntityKeys} from "@/types/entityTypes";
import EntityTable from '@/components/applet/entity/EntityTable';

interface EntityPageParams {
    applet: string;
    entity: EntityKeys;
}

interface EntityPageProps {
    params: Promise<EntityPageParams>;
}

export default async function EntityPage({params}: EntityPageProps) {
    // Await the params since they're now a Promise
    const { applet, entity } = await params;
    
    if (applet === 'tools') {
        const entityConfig = toolEntities.find(e => e.id === entity);

        if (!entityConfig) {
            return notFound();
        }

        return (
            <div className="container py-8">
                <div className="mb-8 flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                        {entityConfig.icon}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">{entityConfig.title}</h1>
                        <p className="text-muted-foreground">{entityConfig.description}</p>
                    </div>
                </div>
                <EntityTable entityKey={entityConfig.entityKey}/>
            </div>
        );
    }

    return notFound();
}