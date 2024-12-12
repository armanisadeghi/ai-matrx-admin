// components/notes-app/layout/EditorLayout.tsx
'use client';


import {FoldersSidebar} from './FoldersSidebar';
import {NotesSidebar} from './NotesSidebar';
import {NoteViewer} from '../core/NoteViewer';
import {DynamicResizableLayout} from '@/components/matrx/resizable/DynamicResizableLayout';
import { useDynamicMeasurements } from '@/hooks/ui/useDynamicMeasurements';

export const EditorLayout = () => {


/*
    const {
        measurements,
        getRef,
        pauseMeasurements,
    } = useDynamicMeasurements({
        buffer: 8,
        debounceMs: 300,
        threshold: 10,
        initialPauseMs: 800
    });

    const quickRefRef = getRef('quickReference');
    const mainContentRef = getRef('mainContent');

    const getAdjustedHeight = (key: string) => {
        const height = measurements[key]?.availableHeight || 0;
        const padding = key === 'quickReference' ? 16 : 24;
        return Math.max(0, height - padding);
    };
*/




    return (
        <div className="flex-1 p-0 gap-0">
            <div className="h-full">
                    <DynamicResizableLayout
                        panels={[
                            {
                                content: <FoldersSidebar/>,
                                defaultSize: 12,
                                minSize: 5,
                                maxSize: 20,
                                collapsible: true
                            },
                            {
                                content: <NotesSidebar/>,
                                defaultSize: 15,
                                minSize: 5,
                                maxSize: 25,
                                collapsible: true
                            },
                            {
                                content: <NoteViewer/>,
                                defaultSize: 73,
                                minSize: 10
                            }
                        ]}
                        direction="horizontal"
                    />
                </div>
            </div>
    );
};

