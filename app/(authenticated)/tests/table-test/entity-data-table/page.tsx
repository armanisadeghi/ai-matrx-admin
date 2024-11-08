// app/data-browser/page.tsx
'use client';

import {useState} from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {EntityKeys} from '@/types/entityTypes';
import PreWiredCardHeader from '@/components/matrx/Entity/EntityCardHeader';
import {EntityBaseTable} from "@/components/matrx/Entity/DataTable/BaseTable";
import DataTable from '@/components/matrx/Entity/DataTable/DataTable';

export default function DataBrowserPage() {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);

    return (
        <div className="h-full w-full p-4">
            <Card className="h-full flex flex-col">
                <PreWiredCardHeader onEntityChange={setSelectedEntity}/>
                <CardContent className="flex-grow flex flex-col justify-between">

                    <div className="flex-1 p-4 overflow-hidden flex flex-col">
                        {selectedEntity ? (
                            <DataTable key={selectedEntity} entityKey={selectedEntity}/>
                        ) : (
                             <div className="h-full flex items-center justify-center text-muted-foreground">
                                 Please select an entity to view its data
                             </div>
                         )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
