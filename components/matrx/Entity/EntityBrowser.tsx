// components/matrx/SchemaTable/EntityBrowser.tsx
'use client';

import {Suspense, useState} from "react";
import {EntityKeys} from "@/types/entityTypes";
import {Card, CardContent} from "@/components/ui";
import PreWiredCardHeader from "@/components/matrx/Entity/addOns/PreWiredCardHeader";
import {MatrxTableLoading} from "@/components/matrx/LoadingComponents";
import {EntityTableContainer} from "@/components/matrx/Entity";

const EntityBrowser = () => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null); // need to eliminate this.

    return (
        <Card className="w-full">
            <PreWiredCardHeader onEntityChange={setSelectedEntity}/>
            <CardContent>
                <Suspense fallback={<MatrxTableLoading/>}>
                    {selectedEntity ? (
                        <EntityTableContainer entityKey={selectedEntity}/>
                    ) : (
                         <div className="text-center py-8 text-muted-foreground">
                             Select an entity to view its data
                         </div>
                     )}
                </Suspense>
            </CardContent>
        </Card>
    );
};

export default EntityBrowser;
