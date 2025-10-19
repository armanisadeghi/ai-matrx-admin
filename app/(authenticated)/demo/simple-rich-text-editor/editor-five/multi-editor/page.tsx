'use client';

import React, { useState } from 'react';
import { EditorWithProviders } from "@/providers/rich-text-editor/withManagedEditor";
import { GripVertical } from 'lucide-react';

const MultiEditorPage = () => {
    const [editors, setEditors] = useState([
        { id: 'editor-1', content: 'First editor' },
        { id: 'editor-2', content: 'Second editor' },
    ]);
    
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);

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
        
        // Create a ghost image that shows a simplified version of the editor
        const dragPreview = document.createElement('div');
        dragPreview.className = 'w-full bg-blue-100 p-4 rounded border-2 border-blue-500';
        dragPreview.innerHTML = `Moving Editor ${id}`;
        document.body.appendChild(dragPreview);
        
        e.dataTransfer.setDragImage(dragPreview, 0, 0);
        
        // Clean up the ghost element after it's no longer needed
        requestAnimationFrame(() => {
            dragPreview.remove();
        });
    };

    const handleDragEnd = () => {
        setDraggedId(null);
        setDropTargetId(null);
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (draggedId !== targetId) {
            setDropTargetId(targetId);
        }
    };

    const handleDragLeave = () => {
        setDropTargetId(null);
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedId || draggedId === targetId) return;

        setEditors(prev => {
            const newEditors = [...prev];
            const draggedIndex = newEditors.findIndex(e => e.id === draggedId);
            const targetIndex = newEditors.findIndex(e => e.id === targetId);
            
            [newEditors[draggedIndex], newEditors[targetIndex]] = 
            [newEditors[targetIndex], newEditors[draggedIndex]];
            
            return newEditors;
        });
        
        setDraggedId(null);
        setDropTargetId(null);
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex gap-2 mb-4">
                <button 
                    onClick={addNewEditor}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                    Add Editor
                </button>
            </div>

            <div className="space-y-4">
                {editors.map(({ id, content }) => (
                    <div 
                        key={id}
                        onDragOver={(e) => handleDragOver(e, id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, id)}
                        className={`
                            relative group transition-all duration-200
                            ${dropTargetId === id ? 'transform scale-[1.02]' : ''}
                            ${draggedId === id ? 'opacity-50' : 'opacity-100'}
                        `}
                    >
                        {/* Drag Handle */}
                        <div 
                            draggable
                            onDragStart={(e) => handleDragStart(e, id)}
                            onDragEnd={handleDragEnd}
                            className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center 
                                     cursor-grab active:cursor-grabbing group-hover:bg-gray-100 
                                     dark:group-hover:bg-gray-700 rounded-l-lg transition-colors"
                        >
                            <GripVertical className="w-5 h-5 text-gray-400" />
                        </div>

                        {/* Remove Button */}
                        <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => removeEditor(id)}
                                className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                            >
                                ×
                            </button>
                        </div>

                        {/* Editor Container */}
                        <div className={`
                            border border-gray-300 dark:border-gray-700 rounded-lg 
                            bg-textured pl-8 p-4
                            ${dropTargetId === id ? 'border-blue-500 shadow-lg' : ''}
                        `}>
                            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                {id}
                            </div>
                            <EditorWithProviders
                                id={id}
                                initialContent={content}
                                className="min-h-[150px]"
                            />
                        </div>

                        {/* Drop Indicator */}
                        {dropTargetId === id && (
                            <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MultiEditorPage;