import { ContentTemplateManager } from '@/components/admin/ContentTemplateManager';

export default function ContentTemplatesPage() {
    return (
        <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden">
            <ContentTemplateManager className="flex-1" />
        </div>
    );
}

