// app/entity-browser/components/EntityBrowserContent.tsx
'use client';

import React, {useState} from 'react';
import {EntityKeys} from '@/types/entityTypes';
import {Card, CardContent} from '@/components/ui/card';
import PreWiredCardHeader from '@/components/matrx/Entity/EntityCardHeader';
import MatrxDynamicPanel from '@/components/matrx/resizable/MatrxDynamicPanel';
import EnhancedEntityAnalyzer from "@/components/admin/redux/EnhancedEntityAnalyzer";
// import {EntityQuickReferenceView} from '../components/dev/EntityQuickReferenceView';
// import EntityQuickReferenceNew from '../components/dev/EntityQuickReferenceNew';
// import EntityAnalyzer from "@/components/admin/EntityAnalyzer";
// import EntityAnalyzerEditor from '@/components/admin/redux/analyzers/EntityAnalyzerEditor';
// import { PanelLeft } from '@/components/matrx/resizable/Panels';
// import {EntityTestView} from "@/app/(authenticated)/tests/crud-operations/basic-crud/EntityQuickTestView";
// import {EntityPage} from "@/app/(authenticated)/tests/crud-operations/components/EntityPage";
import {ThreePanelLayout} from "@/app/(authenticated)/tests/crud-operations/components/ThreePanelLayout";


const EntityBrowserContent: React.FC = () => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);


    return (
        <>
            <Card>
                <PreWiredCardHeader onEntityChange={setSelectedEntity}/>
                <CardContent className="p-0">
                    {selectedEntity ? (
                        <ThreePanelLayout entityKey={selectedEntity}/>
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
