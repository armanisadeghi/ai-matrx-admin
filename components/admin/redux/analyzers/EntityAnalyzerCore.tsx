import {useState, useEffect, useMemo} from 'react';
import {Button} from '@/components/ui/button';
import {CardContent} from '@/components/ui/card';
import {FullJsonViewer} from '@/components/ui';
import {useAppSelector} from '@/lib/redux/hooks';
import {EntityKeys} from '@/types/entityTypes';
import {selectFormattedEntityOptions} from '@/lib/redux/schema/globalCacheSelectors';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
import ResizableBottomPanel from '@/components/matrx/resizable/ResizableBottomPanel';
import ResizableBottomPanel2 from "@/components/matrx/resizable/ResizableBottomPanel2";

interface EntityAnalyzerProps {
    className?: string;
    defaultExpanded?: boolean;
}

const EntityAnalyzerCore = (
    {
        className = '',
        defaultExpanded = false,
    }: EntityAnalyzerProps) => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);
    const [showEntityList, setShowEntityList] = useState(true);
    const entityOptions = useAppSelector(selectFormattedEntityOptions);

    const entitySelectors = useMemo(() => {
        return entityOptions.reduce((acc, {value}) => {
            acc[value] = createEntitySelectors(value);
            return acc;
        }, {} as Record<EntityKeys, ReturnType<typeof createEntitySelectors>>);
    }, [entityOptions]);

    const entityState = useAppSelector((state) => {
        if (!selectedEntity || !entitySelectors[selectedEntity]) return null;
        return {
            entityMetadata: entitySelectors[selectedEntity]?.selectEntity(state)?.entityMetadata,
            records: entitySelectors[selectedEntity]?.selectAllRecords(state),
            quickReference: entitySelectors[selectedEntity]?.selectEntity(state)?.quickReference,
            selection: entitySelectors[selectedEntity]?.selectEntity(state)?.selection,
            pagination: entitySelectors[selectedEntity]?.selectEntity(state)?.pagination,
            loading: entitySelectors[selectedEntity]?.selectEntity(state)?.loading,
            cache: entitySelectors[selectedEntity]?.selectEntity(state)?.cache,
            history: entitySelectors[selectedEntity]?.selectEntity(state)?.history,
            filters: entitySelectors[selectedEntity]?.selectEntity(state)?.filters,
            subscription: entitySelectors[selectedEntity]?.selectEntity(state)?.subscription,
            flags: entitySelectors[selectedEntity]?.selectEntity(state)?.flags,
            metrics: entitySelectors[selectedEntity]?.selectEntity(state)?.metrics,
        };
    });

    const handleEntitySelect = (entity: EntityKeys) => {
        setSelectedEntity(entity);
        setShowEntityList(false);
    };

    return (
        <ResizableBottomPanel2
            className={className}
            defaultExpanded={defaultExpanded}
            expandButtonProps={{
                label: 'Entity State',
                className: 'fixed bottom-4 right-4'
            }}
            header={
                <div className="flex gap-2">
                    {entityOptions.map((entity) => (
                        <Button
                            key={entity.value}
                            variant={selectedEntity === entity.value ? "default" : "outline"}
                            onClick={() => handleEntitySelect(entity.value)}
                            className="text-xs h-6 px-2"
                            size="sm"
                        >
                            {entity.label}
                        </Button>
                    ))}
                </div>
            }
        >
            <CardContent className="p-4">
                {showEntityList ? (
                    <div className="flex gap-1 flex-wrap">
                        {entityOptions.map((entity) => (
                            <Button
                                key={entity.value}
                                variant={selectedEntity === entity.value ? "default" : "outline"}
                                onClick={() => handleEntitySelect(entity.value)}
                                className="text-xs h-6 px-2"
                                size="sm"
                            >
                                {entity.label}
                            </Button>
                        ))}
                    </div>
                ) : (
                     <div
                         className="grid grid-cols-1 gap-4"
                         style={{
                             gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))'
                         }}
                     >
                         {selectedEntity && entityState && (
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
        </ResizableBottomPanel2>
    );
};

export default EntityAnalyzerCore;
