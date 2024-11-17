import React, {useEffect} from 'react';
import {CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {ChevronLeft} from 'lucide-react';
import {EntityKeys} from '@/types/entityTypes';
import {EnhancedJsonViewerGroup} from '@/components/ui/JsonComponents';
import { useEntityAnalyzer } from '@/lib/redux/entity/hooks/useEntityAnalyzer';

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
        <div className="space-y-4">
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
                     <EnhancedJsonViewerGroup
                         viewers={sections}
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
