'use client';

import React, { useState, useRef, useEffect } from 'react';
import { EditorWithProviders } from "@/features/rich-text-editor/withManagedEditor";
import { GripVertical } from 'lucide-react';
import { DropZone } from './DropZone';

const MultiEditorPage = () => {
    const [editors, setEditors] = useState([
        { id: 'editor-1', content: 'First editor' },
        { id: 'editor-2', content: 'Second editor' },
    ]);
    
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dropZoneIndex, setDropZoneIndex] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const addNewEditor = () => {
        const newId = `editor-${editors.length + 1}`;
        setEditors(prev => [...prev, { 
            id: newId, 
            content: `Editor ${editors.length + 1}` 
        }]);
    };

    const removeEditor = (idToRemove: string) => {
        setEditors(prev => prev.filter(editor => editor.id !== idToRemove));
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        
        // Create a constrained ghost image
        const editorElement = e.currentTarget.closest('.editor-container');
        if (editorElement && containerRef.current) {
            const dragPreview = editorElement.cloneNode(true) as HTMLElement;
            const containerWidth = containerRef.current.clientWidth;
            
            // Style the preview
            dragPreview.style.width = `${containerWidth}px`;
            dragPreview.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            dragPreview.style.border = '2px solid rgb(59, 130, 246)';
            dragPreview.style.borderRadius = '8px';
            dragPreview.style.overflow = 'hidden';
            dragPreview.style.opacity = '0.8';
            
            // Hide unnecessary elements in the preview
            const removeBtn = dragPreview.querySelector('.remove-button');
            const dragHandle = dragPreview.querySelector('.drag-handle');
            if (removeBtn) removeBtn.remove();
            if (dragHandle) dragHandle.remove();
            
            document.body.appendChild(dragPreview);
            e.dataTransfer.setDragImage(dragPreview, 20, 20);
            
            // Clean up
            requestAnimationFrame(() => {
                dragPreview.remove();
            });
        }
    };

    const handleDragEnd = () => {
        setDraggedId(null);
        setDropZoneIndex(null);
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (!draggedId) return;

        const draggedIndex = editors.findIndex(e => e.id === draggedId);
        if (draggedIndex === -1) return;

        setEditors(prev => {
            const newEditors = [...prev];
            const [draggedEditor] = newEditors.splice(draggedIndex, 1);
            
            // Adjust insertion index if dragging from before drop position
            const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
            newEditors.splice(adjustedDropIndex, 0, draggedEditor);
            
            return newEditors;
        });
        
        handleDragEnd();
    };

    return (
        <div className="p-4" ref={containerRef}>
            <div className="flex gap-2 mb-4">
                <button 
                    onClick={addNewEditor}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                    Add Editor
                </button>
            </div>

            {/* Initial drop zone */}
            <DropZone
                isActive={dropZoneIndex === 0}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDropZoneIndex(0);
                }}
                onDragLeave={() => setDropZoneIndex(null)}
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
                            className="drag-handle absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center 
                                     cursor-grab active:cursor-grabbing group-hover:bg-gray-100 
                                     dark:group-hover:bg-gray-700 rounded-l-lg transition-colors"
                        >
                            <GripVertical className="w-5 h-5 text-gray-400" />
                        </div>

                        {/* Remove Button */}
                        <div className="remove-button absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => removeEditor(editor.id)}
                                className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                            >
                                ×
                            </button>
                        </div>

                        {/* Editor Container */}
                        <div className="border border-gray-300 dark:border-gray-700 rounded-lg 
                                      bg-white dark:bg-gray-800 pl-8 p-4 mb-2">
                            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                {editor.id}
                            </div>
                            <EditorWithProviders
                                id={editor.id}
                                initialContent={editor.content}
                                className="min-h-[150px]"
                            />
                        </div>
                    </div>

                    {/* Drop zone after each editor */}
                    <DropZone
                        isActive={dropZoneIndex === index + 1}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDropZoneIndex(index + 1);
                        }}
                        onDragLeave={() => setDropZoneIndex(null)}
                        onDrop={(e) => handleDrop(e, index + 1)}
                    />
                </React.Fragment>
            ))}
        </div>
    );
};

export default MultiEditorPage;