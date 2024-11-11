// app/(authenticated)/entity-crud/[entityName]/[primaryKeyField]/[primaryKeyValue]/page.tsx

import EntityRecordServerWrapper from "@/components/matrx/Entity/serverWrappers/EntityRecordServerWrapper";
import {EntityKeys} from "@/types/entityTypes";
import { Card, CardContent } from "@/components/ui";
import { EntityRecordHeader } from "@/components/matrx/Entity/headers/EntityPageHeader";

interface EntityRecordPageProps {
    params: {
        entityName: EntityKeys;
        primaryKeyField: string;
        primaryKeyValue: string;
    };
    searchParams: {
        entityPrettyName: string;
        entityFieldPrettyName: string;
    };
}

export default function EntityRecordPage({ params, searchParams }: EntityRecordPageProps) {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1">
                <Card className="h-full">
                    <EntityRecordHeader
                        entityName={params.entityName}
                        entityPrettyName={searchParams.entityPrettyName}
                        primaryKeyField={params.primaryKeyField}
                        primaryKeyValue={params.primaryKeyValue}
                        fieldPrettyName={searchParams.entityFieldPrettyName}
                        backUrl={`/entity-crud/${params.entityName}?entityPrettyName=${encodeURIComponent(searchParams.entityPrettyName)}`}
                    />
                    <CardContent className="flex-1 p-0">
                        <EntityRecordServerWrapper
                            entityName={params.entityName}
                            primaryKeyField={params.primaryKeyField}
                            primaryKeyValue={params.primaryKeyValue}
                            entityPrettyName={searchParams.entityPrettyName}
                            entityFieldPrettyName={searchParams.entityFieldPrettyName}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
