// features/administration/schema-visualizer/SchemaDetails.tsx
// Standalone details sheet — reads schema overview via React Query.

"use client";

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { useSchemaVisualizerStore } from "./store";
import { useSchemaQuery } from "./hooks/useSchemaQuery";
import { TableDetails } from "./Details/TableDetails";
import { FieldDetails } from "./Details/FieldDetails";
import { RelationshipDetails } from "./Details/RelationshipDetails";

export function SchemaDetails() {
    const { selectedElement, isDetailsOpen, setDetailsOpen } =
        useSchemaVisualizerStore();
    const { data: overview } = useSchemaQuery();

    if (!selectedElement) return null;

    const table = overview?.tables?.[selectedElement.tableName];

    const renderContent = () => {
        if (!selectedElement.tableName || !table) return null;

        switch (selectedElement.type) {
            case "table":
                return <TableDetails table={table} />;
            case "field":
                return (
                    <FieldDetails
                        table={table}
                        fieldName={selectedElement.fieldName!}
                    />
                );
            case "relationship":
                return (
                    <RelationshipDetails
                        table={table}
                        relationshipIndex={selectedElement.relationshipIndex!}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <Sheet open={isDetailsOpen} onOpenChange={setDetailsOpen}>
            <SheetContent>
                <SheetHeader>
                    <div className="flex items-center justify-between">
                        <SheetTitle>
                            {selectedElement.type === "table" && "Table Details"}
                            {selectedElement.type === "field" && "Field Details"}
                            {selectedElement.type === "relationship" &&
                                "Relationship Details"}
                        </SheetTitle>
                    </div>
                </SheetHeader>
                {renderContent()}
            </SheetContent>
        </Sheet>
    );
}
