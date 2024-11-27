// app/entity-browser/components/EntityBrowserContent.tsx
'use client';

import React, {useState} from 'react';
import {EntityKeys} from '@/types/entityTypes';
import {Card, CardContent} from '@/components/ui/card';
import MatrxDynamicPanel from '@/components/matrx/resizable/MatrxDynamicPanel';
import EnhancedEntityAnalyzer from "@/components/admin/redux/EnhancedEntityAnalyzer";
import {EntityThreePanelTester} from "@/components/matrx/Entity/layouts/EntityThreePanelTester";
import EntityCardHeaderSelect
    from "@/components/matrx/Entity/prewired-components/entity-management/parts/CardHeaderSelect";


const EntityBrowserContent: React.FC = () => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);


    return (
        <>
            <Card>
                <EntityCardHeaderSelect onEntityChange={setSelectedEntity}/>
                <CardContent className="p-0">
                    {selectedEntity ? (
                        <EntityThreePanelTester entityKey={selectedEntity}/>
                    ) : (
                         <div className="flex items-center justify-center h-full">
                             <div className="text-center">
                                 <h2 className="text-xl font-semibold mb-2">Select an Entity</h2>
                                 <p className="text-muted-foreground">
                                     Choose an entity from the dropdown above to view and manage its records
                                 </p>
                             </div>
                         </div>
                     )}
                </CardContent>
            </Card>
            <MatrxDynamicPanel
                initialPosition="left"
                defaultExpanded={false}
                expandButtonProps={{
                    label: 'Entity State',
                }}
            >
                <EnhancedEntityAnalyzer
                    selectedEntityKey={selectedEntity}
                    defaultExpanded={false}/>
            </MatrxDynamicPanel>
        </>
    );
};

export default EntityBrowserContent;
