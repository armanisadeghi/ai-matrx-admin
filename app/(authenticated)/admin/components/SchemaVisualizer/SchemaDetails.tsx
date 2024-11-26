// components/SchemaVisualizer/SchemaDetails.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSchemaVisualizerStore } from './store';
import {useAppSelector} from "@/lib/redux/hooks";
import {selectSchema} from "@/lib/redux/schema/globalCacheSelectors";
import {TableDetails} from "@/app/(authenticated)/admin/components/SchemaVisualizer/Details/TableDetails";
import {FieldDetails} from "@/app/(authenticated)/admin/components/SchemaVisualizer/Details/FieldDetails";
import {RelationshipDetails} from "@/app/(authenticated)/admin/components/SchemaVisualizer/Details/RelationshipDetails";

export function SchemaDetails() {
    const { selectedElement, isDetailsOpen, setDetailsOpen } = useSchemaVisualizerStore();
    const schema = useAppSelector(selectSchema);

    if (!selectedElement) return null;

    const renderContent = () => {
        switch (selectedElement.type) {
            case 'table':
                return <TableDetails entity={schema[selectedElement.entityName!]} />;
            case 'field':
                return <FieldDetails
                    entity={schema[selectedElement.entityName!]}
                    fieldName={selectedElement.fieldName!}
                />;
            case 'relationship':
                return <RelationshipDetails
                    entity={schema[selectedElement.entityName!]}
                    relationshipIndex={selectedElement.relationshipIndex!}
                />;
            default:
                return null;
        }
    };

    return (
        <Sheet open={isDetailsOpen} onOpenChange={setDetailsOpen}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>
                        {selectedElement.type === 'table' && 'Table Details'}
                        {selectedElement.type === 'field' && 'Field Details'}
                        {selectedElement.type === 'relationship' && 'Relationship Details'}
                    </SheetTitle>
                </SheetHeader>
                {renderContent()}
            </SheetContent>
        </Sheet>
    );
}
