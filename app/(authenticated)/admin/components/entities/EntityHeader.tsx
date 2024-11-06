// app/components/common/EntityHeader.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from "@/lib/redux/hooks";
import { selectFormattedEntityOptions } from "@/lib/redux/schema/globalCacheSelectors";
import { EntityKeys } from '@/types/entityTypes';
import { useEntity } from '@/lib/redux/entity/useEntity';
import { Loader2 } from 'lucide-react';
import PreWiredEntitySelect from './PrewiredEntitySelect';

interface EntityHeaderProps {
    onEntityChange?: (entity: ReturnType<typeof useEntity>) => void;
}

const EntityHeader: React.FC<EntityHeaderProps> = ({ onEntityChange }) => {
    const entitySelectOptions = useAppSelector(selectFormattedEntityOptions);
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys>(entitySelectOptions[0].value);
    const entity = useEntity(selectedEntity);

    const entityDisplayName = entity.entityMetadata?.displayName || 'Loading...';

    useEffect(() => {
        if (entity.entityMetadata) {
            entity.fetchRecords(1, 10);
        }

        if (onEntityChange) {
            onEntityChange(entity);
        }
    }, [selectedEntity, entity.entityMetadata]);

    if (!entity.entityMetadata) {
        return (
            <div className="flex items-center justify-center h-[100px]">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading entity...</span>
            </div>
        );
    }

    return (
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold">
                    {entityDisplayName}
                </h2>
                <PreWiredEntitySelect
                    selectedEntity={selectedEntity}
                    onValueChange={setSelectedEntity}
                />
            </div>
            <div className="text-sm text-gray-500">
                {/*{entity.entityMetadata.description || 'Manage and view entity data'}*/}
                Manage and view entity data
            </div>
        </div>
    );
};

export default EntityHeader;
