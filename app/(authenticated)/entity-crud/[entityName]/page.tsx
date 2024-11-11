// app/(authenticated)/entity-crud/[entityName]/page.tsx

import {EntityKeys} from "@/types/entityTypes";
import EntityTableServerWrapper from "@/components/matrx/Entity/serverWrappers/EntityTableServerWrapper";
import { Card, CardContent } from "@/components/ui";
import { EntityHeader } from "@/components/matrx/Entity/headers/EntityPageHeader";

interface EntityPageProps {
    params: {
        entityName: EntityKeys;
    };
    searchParams: {
        entityPrettyName: string;
    };
}

export default function EntityPage({ params, searchParams }: EntityPageProps) {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1">
                <Card className="h-full">
                    <EntityHeader
                        entityName={params.entityName}
                        entityPrettyName={searchParams.entityPrettyName}
                        backUrl="/entity-crud"
                        backLabel="Back to Entities"
                    />
                    <CardContent className="flex-1 p-0">
                        <EntityTableServerWrapper
                            selectedEntity={params.entityName}
                            entityPrettyName={searchParams.entityPrettyName}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
