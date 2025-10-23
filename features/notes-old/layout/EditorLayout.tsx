// components/notes-app/layout/EditorLayout.tsx
'use client';

import {UnifiedSidebar} from './UnifiedSidebar';
import {NoteViewer} from '../core/NoteViewer';
import {DynamicResizableLayout} from '@/components/matrx/resizable/DynamicResizableLayout';

export const EditorLayout = () => {
    return (
        <div className="flex-1 flex flex-col min-h-0">
            <DynamicResizableLayout
                panels={[
                    {
                        content: <UnifiedSidebar/>,
                        defaultSize: 18,
                        minSize: 0,
                        maxSize: 30,
                        collapsible: true
                    },
                    {
                        content: <NoteViewer/>,
                        defaultSize: 82,
                        minSize: 50
                    }
                ]}
                direction="horizontal"
            />
        </div>
    );
};

