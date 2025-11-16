import { UserContentTemplateManager } from '@/features/content-templates/components/UserContentTemplateManager';

export default function UserContentTemplatesPage() {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            <UserContentTemplateManager className="flex-1" />
        </div>
    );
}

