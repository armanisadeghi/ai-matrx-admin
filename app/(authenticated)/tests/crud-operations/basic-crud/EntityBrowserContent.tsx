// app/entity-browser/components/EntityBrowserContent.tsx
'use client';

import React, {useState} from 'react';
import {EntityKeys} from '@/types/entityTypes';
import {EntityQuickReferenceView} from './EntityQuickReferenceView';
import {Card, CardContent} from '@/components/ui/card';
import PreWiredCardHeader from '@/components/matrx/Entity/EntityCardHeader';
import EntityAnalyzer from "@/components/admin/EntityAnalyzer";
import MatrxDynamicPanel from '@/components/matrx/resizable/MatrxDynamicPanel';
import EnhancedEntityAnalyzer from "@/components/admin/redux/EnhancedEntityAnalyzer";
import EntityAnalyzerEditor from '@/components/admin/redux/analyzers/EntityAnalyzerEditor';


const EntityBrowserContent: React.FC = () => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);


    return (
        <>
            <Card>
                <PreWiredCardHeader onEntityChange={setSelectedEntity}/>
                <CardContent className="p-0">
                    {selectedEntity ? (
                        <EntityQuickReferenceView entityKey={selectedEntity}/>
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
                initialPosition="bottom"
                defaultExpanded={false}
                headerProps={{
                    title: "Entity State",
                    description: "Debug and analyze entity state",
                }}
                expandButtonProps={{
                    label: 'Entity State',
                    className: 'fixed bottom-4 right-4'
                }}
            >
                <EnhancedEntityAnalyzer defaultExpanded={false}/>
            </MatrxDynamicPanel>
        </>
    );
};

export default EntityBrowserContent;
