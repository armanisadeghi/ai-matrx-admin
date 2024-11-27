// components/matrix/SchemaTable/EntityCardHeader.tsx
import {CardHeader, CardTitle, CardDescription} from '@/components/ui/card';

interface EntityCardHeaderProps {
    title: string;
    description?: string;
    children?: React.ReactNode;
}

export const EntityCardHeader: React.FC<EntityCardHeaderProps> = (
    {
        title,
        description = "Browse & Manage Entities",
        children
    }) => (
    <CardHeader
        className="border-2 border-gray-500 flex flex-col lg:flex-row items-center justify-between p-4 lg:p-6 space-y-4 lg:space-y-0 min-h-[6rem] lg:h-24">
        <div className="flex flex-col justify-center text-center lg:text-left">
            <CardTitle className="text-lg lg:text-xl">{title}</CardTitle>
            <CardDescription className="text-sm lg:text-base">
                {description}
            </CardDescription>
        </div>
        {children}
    </CardHeader>
);

export default EntityCardHeader;
