'use client';

import React, {Suspense, useEffect} from 'react';
import {CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {ChevronLeft} from 'lucide-react';
import {EntityKeys} from '@/types/entityTypes';
import {useEntityAnalyzer} from '@/lib/redux/entity/hooks/useEntityAnalyzer';
import EntityAnalyzerView from "@/components/admin/redux/EntityAnalysisSummary";
import {MatrxJsonToCollapsible} from "@/components/matrx/matrx-collapsible";
import dynamic from 'next/dynamic';

const EnhancedJsonViewerGroup = dynamic(() => import('@/components/ui/JsonComponents/JsonViewerComponent').then(mod => mod.EnhancedJsonViewerGroup), {
    ssr: false
});

const LoadingState = () => (
    <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="h-32 bg-muted rounded"></div>
    </div>
);


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
    const {
        selectedEntityKey: currentEntityKey,
        entityOptions,
        sections,
        isViewingEntity,
        getEntityLabel,
        selectEntity,
        showEntityList
    } = useEntityAnalyzer(selectedEntityKey);

    useEffect(() => {
        if (selectedEntityKey !== undefined) {
            selectEntity(selectedEntityKey);
        }
    }, [selectedEntityKey]);

    const handleEntitySelect = (entity: EntityKeys) => {
        selectEntity(entity);
        onEntityChange?.(entity);
    };

    return (
        <div className="space-y-4 scrollbar-none">
            {isViewingEntity && (
                <div className="flex items-center border-b border-border pb-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={showEntityList}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1"/>
                        <span className="text-sm font-medium">
              {currentEntityKey && getEntityLabel(currentEntityKey)}
            </span>
                    </Button>
                </div>
            )}

            <CardContent className="p-4 pt-0">
                {!isViewingEntity ? (
                    <div className="flex gap-2 flex-wrap">
                        {entityOptions.map((entity) => (
                            <Button
                                key={entity.value}
                                variant={currentEntityKey === entity.value ? "default" : "outline"}
                                onClick={() => handleEntitySelect(entity.value)}
                                className="text-sm"
                                size="sm"
                            >
                                {entity.label}
                            </Button>
                        ))}
                    </div>
                ) : (
                     <>
                         <EntityAnalyzerView entityKey={currentEntityKey}/>

                         <p className="text-md text-primary pl-2 mt-4">
                                Automated Data Conversion
                            </p>

                         {sections.map((section) => (
                             <MatrxJsonToCollapsible
                                 key={section.id}
                                 title={section.title}
                                 data={section.data}
                                 level={0}
                             />
                         ))}

                         <Suspense fallback={<LoadingState />}>
                             <EnhancedJsonViewerGroup
                                 viewers={sections}
                                 layout="autoGrid"
                                 minimizedPosition="top"
                                 className="min-h-0"
                                 gridMinWidth="250px"
                             />
                         </Suspense>
                     </>
                 )}
            </CardContent>
        </div>
    );
};

export default EnhancedEntityAnalyzer;
