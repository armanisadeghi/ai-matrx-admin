'use client';

import React from 'react';
import { GripVertical } from 'lucide-react';
import { DropZone } from './DropZone';
import { useDraggableEditors } from './useDraggableEditors';
import MessageEditor from '@/features/rich-text-editor/provider/withMessageEditor';

const MultiEditorPage = () => {
    const {
        editors,
        draggedId,
        dropZoneIndex,
        containerRef,
        handleDragStart,
        handleDragEnd,
        handleDrop,
        addNewEditor,
        removeEditor,
        handleDropZoneDragOver,
        handleDropZoneDragLeave,
    } = useDraggableEditors();

    return (
        <div
            className='p-4'
            ref={containerRef}
        >
            <div className='flex gap-2 mb-4'>
                <button
                    onClick={addNewEditor}
                    className='px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600'
                >
                    Add Editor
                </button>
            </div>

            {/* Initial drop zone */}
            <DropZone
                isActive={dropZoneIndex === 0}
                onDragOver={(e) => handleDropZoneDragOver(0, e)}
                onDragLeave={handleDropZoneDragLeave}
                onDrop={(e) => handleDrop(e, 0)}
            />

            {editors.map((editor, index) => (
                <React.Fragment key={editor.id}>
                    <div
                        className={`
                            editor-container relative group
                            transition-all duration-200
                            ${draggedId === editor.id ? 'opacity-50' : 'opacity-100'}
                        `}
                    >
                        {/* Drag Handle */}
                        <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, editor.id)}
                            onDragEnd={handleDragEnd}
                            className='drag-handle absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center 
                                     cursor-grab active:cursor-grabbing group-hover:bg-gray-100 
                                     dark:group-hover:bg-gray-700 rounded-l-lg transition-colors'
                        >
                            <GripVertical className='w-5 h-5 text-gray-400' />
                        </div>

                        {/* Remove Button */}
                        <div className='remove-button absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                            <button
                                onClick={() => removeEditor(editor.id)}
                                className='p-1 bg-red-500 text-white rounded-full hover:bg-red-600'
                            >
                                ×
                            </button>
                        </div>

                        {/* Editor Container */}
                        <MessageEditor
                            id={editor.id}
                            initialContent={editor.content}
                            className='min-h-[150px]'
                            onMessageUpdate={(data) => {
                                // Handle message updates
                                console.log('Message updated:', data);
                            }}
                            onChipUpdate={(data) => {
                                // Handle chip changes
                                console.log('Chip changed:', data);
                            }}
                        />
                    </div>

                    {/* Drop zone after each editor */}
                    <DropZone
                        isActive={dropZoneIndex === index + 1}
                        onDragOver={(e) => handleDropZoneDragOver(index + 1, e)}
                        onDragLeave={handleDropZoneDragLeave}
                        onDrop={(e) => handleDrop(e, index + 1)}
                    />
                </React.Fragment>
            ))}
        </div>
    );
};

export default MultiEditorPage;
