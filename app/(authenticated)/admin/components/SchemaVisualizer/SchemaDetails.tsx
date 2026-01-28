// components/SchemaVisualizer/SchemaDetails.ts
'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useSchemaVisualizerStore } from './store';
import {useAppSelector} from "@/lib/redux/hooks";
import {selectSchema} from "@/lib/redux/schema/globalCacheSelectors";
import {TableDetails} from "@/app/(authenticated)/admin/components/SchemaVisualizer/Details/TableDetails";
import {FieldDetails} from "@/app/(authenticated)/admin/components/SchemaVisualizer/Details/FieldDetails";
import {RelationshipDetails} from "@/app/(authenticated)/admin/components/SchemaVisualizer/Details/RelationshipDetails";
import {AutomationEntity, EntityKeys} from "@/types/entityTypes";

export function SchemaDetails() {
    const { selectedElement, isDetailsOpen, setDetailsOpen } = useSchemaVisualizerStore();
    const schema = useAppSelector(selectSchema);
    const router = useRouter();

    if (!selectedElement) return null;

    const handleDeleteNavigate = () => {
        if (selectedElement.entityName) {
            const entityName = selectedElement.entityName;
            const entity = schema[entityName];
            const entityPrettyName = entity?.entityNameFormats?.pretty || entityName;
            router.push(`/entity-crud/${entityName}?entityPrettyName=${encodeURIComponent(entityPrettyName)}`);
            setDetailsOpen(false);
        }
    };

    const renderContent = () => {
        if (!selectedElement.entityName) return null;
        
        const entityName = selectedElement.entityName;
        const entity = schema[entityName];
        
        switch (selectedElement.type) {
            case 'table':
                return <TableDetails entity={entity} />;
            case 'field':
                return <FieldDetails<typeof entityName>
                    entity={entity as AutomationEntity<typeof entityName>}
                    fieldName={selectedElement.fieldName!}
                />;
            case 'relationship':
                return <RelationshipDetails<typeof entityName>
                    entity={entity as AutomationEntity<typeof entityName>}
                    relationshipIndex={selectedElement.relationshipIndex!}
                />;
            default:
                return null;
        }
    };

    const entity = selectedElement.entityName ? schema[selectedElement.entityName] : null;
    const entityPrettyName = entity?.entityNameFormats?.pretty || selectedElement.entityName || 'this entity';

    return (
        <Sheet open={isDetailsOpen} onOpenChange={setDetailsOpen}>
            <SheetContent>
                <SheetHeader>
                    <div className="flex items-center justify-between">
                        <SheetTitle>
                            {selectedElement.type === 'table' && 'Table Details'}
                            {selectedElement.type === 'field' && 'Field Details'}
                            {selectedElement.type === 'relationship' && 'Relationship Details'}
                        </SheetTitle>
                        {selectedElement.type === 'table' && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Manage & Delete Records</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Navigate to the entity management page for <strong>{entityPrettyName}</strong> to view and delete records. This will open the management interface where you can perform deletion operations.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDeleteNavigate}
                                            className="bg-destructive hover:bg-destructive/90"
                                        >
                                            Go to Management Page
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </SheetHeader>
                {renderContent()}
            </SheetContent>
        </Sheet>
    );
}
