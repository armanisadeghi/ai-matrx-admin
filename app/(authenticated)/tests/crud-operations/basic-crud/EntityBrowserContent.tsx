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
import { PanelLeft } from '@/components/matrx/resizable/Panels';


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
            {/*<PanelLeft*/}
            {/*    header={<h2>Left Panel</h2>}*/}
            {/*    defaultSize={30}*/}
            {/*        headerProps={{*/}
            {/*            title: "Entity State",*/}
            {/*            description: "Debug and analyze entity state",*/}
            {/*        }}*/}

            {/*    onResize={(sizes) => console.log('Panel resized:', sizes)}*/}
            {/*>*/}
            {/*    <div className="p-4">*/}
            {/*        <EnhancedEntityAnalyzer defaultExpanded={false}/>*/}
            {/*    </div>*/}
            {/*</PanelLeft>*/}

            <MatrxDynamicPanel
                initialPosition="left"
                defaultExpanded={false}
                expandButtonProps={{
                    label: 'Entity State',
                }}
            >
                <EnhancedEntityAnalyzer defaultExpanded={false}/>
            </MatrxDynamicPanel>
        </>
    );
};

export default EntityBrowserContent;
