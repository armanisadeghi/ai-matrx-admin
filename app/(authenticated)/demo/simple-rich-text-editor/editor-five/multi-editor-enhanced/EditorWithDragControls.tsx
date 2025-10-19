'use client';

import { EditorWithProviders } from "@/providers/rich-text-editor/withManagedEditor";
import { GripVertical, X } from "lucide-react";

const Editor = ({
    id,
    content,
    onRemove,
    onDragStart,
    onDragEnd,
    isDragging
}: {
    id: string;
    content: string;
    onRemove: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    isDragging: boolean;
}) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        // Prevent the editor content from being draggable
        if (!e.currentTarget.classList.contains('drag-handle')) {
            e.preventDefault();
            return;
        }
        
        // Call the parent's drag start handler
        onDragStart(e);
    };

    return (
        <div 
            className={`
                editor-container relative group
                transition-all duration-200
                ${isDragging ? 'opacity-50 scale-98' : 'opacity-100'}
            `}
            draggable={false} // Prevent the entire container from being draggable
        >
            {/* Editor Container */}
            <div 
                className="border border-gray-300 dark:border-gray-700 rounded-lg 
                          bg-textured p-4 pr-12
                          shadow-sm hover:shadow-md transition-shadow"
                draggable={false} // Prevent editor content from being draggable
            >
                <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    {id}
                </div>
                <EditorWithProviders
                    id={id}
                    initialContent={content}
                    className="min-h-[150px]"
                />
            </div>

            {/* Right-side control panel */}
            <div 
                className="absolute right-0 top-0 bottom-0 flex flex-col items-center 
                          justify-between py-2 px-1 group-hover:bg-gray-100/80 
                          dark:group-hover:bg-gray-700/80 rounded-r-lg transition-colors"
                draggable={false}
            >
                {/* Drag Handle - explicitly draggable */}
                <div 
                    draggable={true}
                    onDragStart={handleDragStart}
                    onDragEnd={onDragEnd}
                    className="drag-handle flex-1 w-10 flex items-center justify-center cursor-grab 
                             active:cursor-grabbing transition-colors"
                >
                    <GripVertical className="w-5 h-5 text-gray-400 hover:text-gray-600 
                                          dark:hover:text-gray-300" />
                </div>

                {/* Delete Button */}
                <button
                    onClick={onRemove}
                    className="w-6 h-6 flex items-center justify-center rounded-full
                             hover:bg-red-100 dark:hover:bg-red-900/30 group/delete
                             transition-colors"
                >
                    <X className="w-4 h-4 text-gray-400 group-hover/delete:text-red-500 
                              dark:group-hover/delete:text-red-400" />
                </button>
            </div>
        </div>
    );
};

export default Editor;