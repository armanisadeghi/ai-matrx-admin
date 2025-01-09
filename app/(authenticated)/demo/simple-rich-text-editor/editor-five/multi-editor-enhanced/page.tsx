'use client';

import React, { useState, useRef } from 'react';
import DropZone from './DropZone';
import Editor from './EditorWithDragControls';


const MultiEditorPage = () => {
    const [editors, setEditors] = useState([
        { id: 'editor-1', content: 'First editor' },
        { id: 'editor-2', content: 'Second editor' },
    ]);
    
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dropZoneIndex, setDropZoneIndex] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        
        // Create a constrained ghost image with full width
        const editorElement = e.currentTarget.closest('.editor-container');
        if (editorElement && containerRef.current) {
            const dragPreview = editorElement.cloneNode(true) as HTMLElement;
            const containerWidth = containerRef.current.clientWidth;
            const containerRect = containerRef.current.getBoundingClientRect();
            const editorRect = editorElement.getBoundingClientRect();
            
            // Calculate the left offset to align with container
            const leftOffset = editorRect.left - containerRect.left;
            
            // Style the preview
            dragPreview.style.width = `${containerWidth}px`;
            dragPreview.style.position = 'absolute';
            dragPreview.style.left = `-${leftOffset}px`; // Adjust position to align with container
            dragPreview.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
            dragPreview.style.border = '2px solid rgb(96, 165, 250)';
            dragPreview.style.borderRadius = '12px';
            dragPreview.style.overflow = 'hidden';
            dragPreview.style.opacity = '0.9';
            dragPreview.style.padding = '16px';
            dragPreview.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            
            // Remove control elements from preview
            const controls = dragPreview.querySelectorAll('.absolute');
            controls.forEach(control => control.remove());
            
            document.body.appendChild(dragPreview);
            e.dataTransfer.setDragImage(dragPreview, leftOffset + 20, 20);
            
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

    return (
        <div className="p-4" ref={containerRef}>
            <div className="flex gap-2 mb-8">
                <button 
                    onClick={addNewEditor}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600
                             transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                    Add Editor
                </button>
            </div>

            <div className="relative space-y-6">
                {editors.map((editor, index) => (
                    <div key={editor.id} className="relative">
                        {/* Drop zone before first editor */}
                        {index === 0 && (
                            <DropZone
                                isFirst
                                isActive={dropZoneIndex === 0}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDropZoneIndex(0);
                                }}
                                onDragLeave={() => setDropZoneIndex(null)}
                                onDrop={(e) => handleDrop(e, 0)}
                            />
                        )}

                        <Editor
                            id={editor.id}
                            content={editor.content}
                            onRemove={() => removeEditor(editor.id)}
                            onDragStart={(e) => handleDragStart(e, editor.id)}
                            onDragEnd={handleDragEnd}
                            isDragging={draggedId === editor.id}
                        />

                        {/* Drop zone after each editor */}
                        <DropZone
                            isLast={index === editors.length - 1}
                            isActive={dropZoneIndex === index + 1}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDropZoneIndex(index + 1);
                            }}
                            onDragLeave={() => setDropZoneIndex(null)}
                            onDrop={(e) => handleDrop(e, index + 1)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MultiEditorPage;