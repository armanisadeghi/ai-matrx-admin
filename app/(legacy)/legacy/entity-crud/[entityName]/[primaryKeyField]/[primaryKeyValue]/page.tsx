// app/(authenticated)/entity-crud/[entityName]/[primaryKeyField]/[primaryKeyValue]/page.tsx

import EntityRecordServerWrapper from "@/components/matrx/Entity/serverWrappers/EntityRecordServerWrapper";
import {EntityKeys} from "@/types/entityTypes";
import { Card, CardContent } from "@/components/ui";
import { EntityRecordHeader } from "@/components/matrx/Entity/headers/EntityPageHeader";

type Params = Promise<{
    entityName: EntityKeys;
    primaryKeyField: string;
    primaryKeyValue: string;
}>;

type SearchParams = Promise<{
    entityPrettyName: string;
    entityFieldPrettyName: string;
    [key: string]: string | string[] | undefined;
}>;

interface EntityRecordPageProps {
    params: Params;
    searchParams: SearchParams;
}

export default async function EntityRecordPage(props: EntityRecordPageProps) {
    // Await both params and searchParams before using
    const [params, searchParams] = await Promise.all([
        props.params,
        props.searchParams
    ]);

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
