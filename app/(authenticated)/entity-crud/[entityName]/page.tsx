// app/(authenticated)/entity-crud/[entityName]/page.tsx
import { EntityKeys } from "@/types/entityTypes";
import EntityComponent from "./EntityComponent";

export default function EntityPage({
                                       params,
                                       searchParams
                                   }: {
    params: { entityName: EntityKeys };
    searchParams: { prettyName: string };
}) {
    return (
        <EntityComponent
            selectedEntity={params.entityName}
            entityPrettyName={searchParams.prettyName}
        />
    );
}
