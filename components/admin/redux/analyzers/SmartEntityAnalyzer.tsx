'use client';

import React, {useEffect} from 'react';
import {CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {ChevronLeft} from 'lucide-react';
import {EntityKeys} from '@/types/entityTypes';
import {EnhancedJsonViewerGroup} from '@/components/ui/JsonComponents';
import {useEntityAnalyzer} from '@/lib/redux/entity/hooks/useEntityAnalyzer';
import EntityAnalyzerView from "@/components/admin/redux/EntityAnalysisSummary";
import { MatrxJsonToCollapsible } from '@/components/matrx/matrx-collapsible';


interface EnhancedEntityAnalyzerProps {
    className?: string;
    defaultExpanded?: boolean;
    selectedEntityKey?: EntityKeys | null;
    onEntityChange?: (entity: EntityKeys | null) => void;
}

// Sections that benefit from collapsible view
const COLLAPSIBLE_SECTIONS = [
    'selection',
    'records',
    'unsavedRecords',
    'entityMetadata',
    'pendingOperations',
    'quickReference'
];

// Sections that should stay as JSON due to their nature
const JSON_ONLY_SECTIONS = [
    'flags',
    'loading',
    'cache',
    'filters',
    'subscription',
    'metrics'
];

const SmartSectionView: React.FC<{
    id: string;
    title: string;
    data: any;
    allowMinimize: boolean;
}> = ({id, title, data, allowMinimize}) => {
    // Use JSON view for specific sections or when data is simple
    if (JSON_ONLY_SECTIONS.includes(id) ||
        (!Array.isArray(data) && typeof data !== 'object')) {
        return (
            <EnhancedJsonViewerGroup
                viewers={[{id, title, data, allowMinimize}]}
                layout="autoGrid"
                minimizedPosition="top"
                className="min-h-0"
                gridMinWidth="350px"
            />
        );
    }

    // Use collapsible view for complex data structures
    return (
        <div className="border rounded-lg bg-card">
            <MatrxJsonToCollapsible
                key={`section-${id}`}
                data={data}
                title={title}
                level={0}
                className="p-2"
            />
        </div>
    );
};

const EntitySections: React.FC<{
    sections: Array<{
        id: string;
        title: string;
        data: any;
        allowMinimize: boolean;
    }>;
}> = ({sections}) => {
    // Group sections by visualization type
    const collapsibleSections = sections.filter(s => COLLAPSIBLE_SECTIONS.includes(s.id));
    const jsonSections = sections.filter(s => JSON_ONLY_SECTIONS.includes(s.id));
    const remainingSections = sections.filter(s =>
        !COLLAPSIBLE_SECTIONS.includes(s.id) && !JSON_ONLY_SECTIONS.includes(s.id)
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collapsibleSections.map(section => (
                <SmartSectionView key={section.id} {...section} />
            ))}

            {jsonSections.length > 0 && (
                <div className="md:col-span-2">
                    <EnhancedJsonViewerGroup
                        viewers={jsonSections}
                        layout="autoGrid"
                        minimizedPosition="top"
                        className="min-h-0"
                        gridMinWidth="350px"
                    />
                </div>
            )}

            {remainingSections.map(section => (
                <SmartSectionView key={section.id} {...section} />
            ))}
        </div>
    );
};

const SmartEntityAnalyzer: React.FC<EnhancedEntityAnalyzerProps> = (
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
    }, [selectedEntityKey, selectEntity]);

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
                     <div className="space-y-6">
                         <EntityAnalyzerView entityKey={currentEntityKey!}/>
                         <EntitySections sections={sections}/>
                     </div>
                 )}
            </CardContent>
        </div>
    );
};

export default SmartEntityAnalyzer;
