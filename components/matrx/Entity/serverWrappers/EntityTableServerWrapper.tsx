// app/(authenticated)/entity-crud/[entityName]/EntityComponent.tsx
import {Suspense} from "react";
import {EntityKeys} from "@/types/entityTypes";
import {Card, CardContent} from "@/components/ui";
import {MatrxTableLoading} from "@/components/matrx/LoadingComponents";
import EntityTableContainer from "@/components/matrx/Entity/EntityTableContainer";

interface EntityTableServerWrapperProps {
    selectedEntity: EntityKeys;
    entityPrettyName?: string;
}

const EntityTableServerWrapper = ({selectedEntity}: EntityTableServerWrapperProps) => {
    return (
        <Suspense fallback={<MatrxTableLoading/>}>
            <EntityTableContainer entityKey={selectedEntity}/>
        </Suspense>
    );
};

export default EntityTableServerWrapper;
