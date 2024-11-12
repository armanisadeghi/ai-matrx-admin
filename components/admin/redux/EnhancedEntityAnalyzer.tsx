import React, {useState, useEffect} from 'react';
import {CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {ChevronLeft} from 'lucide-react';
import {EntityKeys} from '@/types/entityTypes';
import {selectFormattedEntityOptions} from '@/lib/redux/schema/globalCacheSelectors';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
import {useAppDispatch, useAppSelector} from '@/lib/redux/hooks';
import {EnhancedJsonViewerGroup} from '@/components/ui/JsonComponents';

interface EnhancedEntityAnalyzerProps {
    className?: string;
    defaultExpanded?: boolean;
    selectedEntityKey?: EntityKeys | null;
    onEntityChange?: (entity: EntityKeys | null) => void;
}

const EnhancedEntityAnalyzer: React.FC<EnhancedEntityAnalyzerProps> = (
    {
        className = '',
        defaultExpanded = false,
        selectedEntityKey,
        onEntityChange
    }) => {
    const [localSelectedEntity, setLocalSelectedEntity] = useState<EntityKeys | null>(selectedEntityKey ?? null);
    const [showEntityList, setShowEntityList] = useState(true);

    useEffect(() => {
        if (selectedEntityKey !== undefined) {
            setLocalSelectedEntity(selectedEntityKey);
        }
    }, [selectedEntityKey]);

    const dispatch = useAppDispatch();
    const entityOptions = useAppSelector(selectFormattedEntityOptions);
    const entityState = useAppSelector((state) =>
        localSelectedEntity ? state.entities[localSelectedEntity] : null
    );

    const handleEntitySelect = (entity: EntityKeys) => {
        setLocalSelectedEntity(entity);
        setShowEntityList(false);
        onEntityChange?.(entity);
    };

    const getEntityViewers = () => {
        if (!entityState) return [];

        const stateMap = {
            entityMetadata: {title: "Entity Metadata", data: entityState.entityMetadata},
            records: {title: "Records", data: entityState.records},
            quickReference: {title: "Quick Reference", data: entityState.quickReference},
            selection: {title: "Selection State", data: entityState.selection},
            pagination: {title: "Pagination State", data: entityState.pagination},
            loading: {title: "Loading State", data: entityState.loading},
            cache: {title: "Cache State", data: entityState.cache},
            history: {title: "History State", data: entityState.history},
            filters: {title: "Filter State", data: entityState.filters},
            subscription: {title: "Subscription Config", data: entityState.subscription},
            flags: {title: "Entity Flags", data: entityState.flags},
            metrics: {title: "Entity Metrics", data: entityState.metrics}
        };

        return Object.entries(stateMap)
            .filter(([_, value]) => value.data !== undefined)
            .map(([key, value]) => ({
                id: key,
                title: value.title,
                data: value.data,
                allowMinimize: true
            }));
    };

    return (
        <div className="space-y-4">
            {!showEntityList && (
                <div className="flex items-center border-b border-border pb-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowEntityList(true)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1"/>
                        <span className="text-sm font-medium">
                            {entityOptions.find(e => e.value === localSelectedEntity)?.label}
                        </span>
                    </Button>
                </div>
            )}

            <CardContent className="p-4 pt-0">
                {showEntityList ? (
                    <div className="flex gap-2 flex-wrap">
                        {entityOptions.map((entity) => (
                            <Button
                                key={entity.value}
                                variant={localSelectedEntity === entity.value ? "default" : "outline"}
                                onClick={() => handleEntitySelect(entity.value)}
                                className="text-sm"
                                size="sm"
                            >
                                {entity.label}
                            </Button>
                        ))}
                    </div>
                ) : (
                     <EnhancedJsonViewerGroup
                         viewers={getEntityViewers()}
                         layout="autoGrid"
                         minimizedPosition="top"
                         className="min-h-0"
                         gridMinWidth="350px"
                     />
                 )}
            </CardContent>
        </div>
    );
};

export default EnhancedEntityAnalyzer;
