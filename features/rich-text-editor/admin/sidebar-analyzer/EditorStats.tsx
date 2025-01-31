'use client';

import React from 'react';

export const EditorStats = ({ state }: { state: any }) => (
    <div className='flex gap-4 text-sm'>
        <div>
            <span className='text-muted-foreground'>Chips:</span>
            <span className='ml-1'>{state.chipCounter}</span>
        </div>
        <div>
            <span className='text-muted-foreground'>Dragging:</span>
            <span className='ml-1'>{state.draggedChip ? 'Yes' : 'No'}</span>
        </div>
        <div>
            <span className='text-muted-foreground'>Colors:</span>
            <span className='ml-1'>{state.colorAssignments?.value?.length || 0}</span>
        </div>
    </div>
);
