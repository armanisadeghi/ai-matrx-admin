// app/(authenticated)/entity-crud/[entityName]/EntityComponent.tsx
import { Suspense } from "react";
import { EntityKeys } from "@/types/entityTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { MatrxTableLoading } from "@/components/matrx/LoadingComponents";
import EntityTableContainer from "@/components/matrx/Entity/EntityTableContainer";
import { Database, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface EntityComponentProps {
    selectedEntity: EntityKeys;
    entityPrettyName: string;
}

const EntityComponent = ({ selectedEntity, entityPrettyName }: EntityComponentProps) => {
    return (
        <Card className="w-full">
            <CardHeader className="border-b bg-card">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Database className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold">
                                {entityPrettyName}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Manage and view {entityPrettyName.toLowerCase()} records
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/entity-crud"
                        className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Entities
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                <Suspense fallback={<MatrxTableLoading/>}>
                    <EntityTableContainer entityKey={selectedEntity}/>
                </Suspense>
            </CardContent>
        </Card>
    );
};

export default EntityComponent;
