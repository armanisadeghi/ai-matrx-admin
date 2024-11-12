import React, {useState, useEffect} from 'react';
import {CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {FullJsonViewer} from '@/components/ui';
import {ChevronLeft} from 'lucide-react';
import {EntityKeys} from '@/types/entityTypes';
import {selectFormattedEntityOptions} from '@/lib/redux/schema/globalCacheSelectors';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
import {useAppDispatch, useAppSelector} from '@/lib/redux/hooks';

interface EntityAnalyzerProps {
    className?: string;
    defaultExpanded?: boolean;
    selectedEntityKey?: EntityKeys | null;
    onEntityChange?: (entity: EntityKeys | null) => void;
}

const EntityAnalyzer: React.FC<EntityAnalyzerProps> = (
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

    const entitySelectors = React.useMemo(() => {
        const selectors: Record<EntityKeys, ReturnType<typeof createEntitySelectors>> = {} as any;
        entityOptions.forEach((option) => {
            selectors[option.value] = createEntitySelectors(option.value);
        });
        return selectors;
    }, [entityOptions]);

    const entityState = useAppSelector((state) =>
        localSelectedEntity ? state.entities[localSelectedEntity] : null
    );

    const handleEntitySelect = (entity: EntityKeys) => {
        setLocalSelectedEntity(entity);
        setShowEntityList(false);
        onEntityChange?.(entity);
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
                     <div className="grid grid-cols-1 gap-4"
                          style={{
                              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))'
                          }}>
                         {localSelectedEntity && entityState && (
                             <>
                                 <FullJsonViewer
                                     data={entityState.entityMetadata}
                                     title="Entity Metadata"
                                     initialExpanded={true}
                                 />
                                 <FullJsonViewer
                                     data={entityState.records}
                                     title="Records"
                                     initialExpanded={true}
                                 />
                                 <FullJsonViewer
                                     data={entityState.quickReference}
                                     title="Quick Reference"
                                     initialExpanded={true}
                                 />
                                 <FullJsonViewer
                                     data={entityState.selection}
                                     title="Selection State"
                                     initialExpanded={true}
                                 />
                                 <FullJsonViewer
                                     data={entityState.pagination}
                                     title="Pagination State"
                                     initialExpanded={true}
                                 />
                                 <FullJsonViewer
                                     data={entityState.loading}
                                     title="Loading State"
                                     initialExpanded={true}
                                 />
                                 <FullJsonViewer
                                     data={entityState.cache}
                                     title="Cache State"
                                     initialExpanded={true}
                                 />
                                 <FullJsonViewer
                                     data={entityState.history}
                                     title="History State"
                                     initialExpanded={true}
                                 />
                                 <FullJsonViewer
                                     data={entityState.filters}
                                     title="Filter State"
                                     initialExpanded={true}
                                 />
                                 <FullJsonViewer
                                     data={entityState.subscription}
                                     title="Subscription Config"
                                     initialExpanded={true}
                                 />
                                 <FullJsonViewer
                                     data={entityState.flags}
                                     title="Entity Flags"
                                     initialExpanded={true}
                                 />
                                 <FullJsonViewer
                                     data={entityState.metrics}
                                     title="Entity Metrics"
                                     initialExpanded={true}
                                 />
                             </>
                         )}
                     </div>
                 )}
            </CardContent>
        </div>
    );
};

export default EntityAnalyzer;
