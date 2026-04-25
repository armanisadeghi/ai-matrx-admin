import { EntityKeys } from "@/types/entityTypes";
import { getEntityDisplayName } from "@/utils/schema/schema-processing/server-side-schema";
import EntityPageClient from "./EntityPageClient";

export default async function Page({ params }: { params: Promise<{ entity: string }> }) {
    const resolvedParams = await params;
    const entity = resolvedParams.entity;
    const entityDisplayName = getEntityDisplayName(entity as EntityKeys);

    return <EntityPageClient entityKey={entity as EntityKeys} />;
}
