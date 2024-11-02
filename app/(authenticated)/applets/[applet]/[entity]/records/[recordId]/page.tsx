// app/(authenticated)/applets/[applet]/[entity]/records/[recordId]/page.tsx
import {EntityKeys} from "@/types/entityTypes";
import {RecordView} from "@/components/record/RecordView";

interface RecordPageProps {
    params: {
        applet: string;
        entity: string;
        recordId: string;
    };
}

export default function RecordPage({ params }: RecordPageProps) {
    return (
        <div className="container py-8">
            <RecordView
                recordId={params.recordId}
                entity={params.entity as EntityKeys}
            />
        </div>
    );
}

