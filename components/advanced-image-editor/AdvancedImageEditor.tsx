"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from 'next/image';
import { motion } from 'motion/react';
import { Icon } from '@iconify/react';
import FreeFormSelection from './tools/FreeFormSelection';
import CutPasteTool from './tools/CutPasteTool';
import OpacityTool from './tools/OpacityTool';
import LayerManagement from './tools/LayerManagement';

import '/vendors/fabric.js';

declare global {
    interface Window {
        fabric: any;
    }
}

const ToolButton: React.FC<{ icon: string; text: string; onClick: () => void }> = ({ icon, text, onClick }) => (
    <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative p-2 bg-gray-200 dark:bg-gray-700 rounded-full group"
        onClick={onClick}
    >
        <Icon icon={icon} className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        <span className="absolute invisible group-hover:visible bg-black dark:bg-white text-white dark:text-black text-xs rounded py-1 px-2 -bottom-8 left-1/2 transform -translate-x-1/2">
            {text}
        </span>
    </motion.button>
);

const AdvancedImageEditor: React.FC = () => {
    const [canvas, setCanvas] = useState<any>(null);
    const [copiedObject, setCopiedObject] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const c = new window.fabric.Canvas("canvas", {
            width: 800,
            height: 600,
            backgroundColor: '#f0f0f0',
            transparentCorners: false,
            cornerColor: "#2BEBC8",
            cornerStyle: "rect",
            cornerStrokeColor: "#2BEBC8",
            cornerSize: 6
        });

        setCanvas(c);

        return () => {
            c.dispose();
        };
    }, []);

    const setMode = (mode: 'select' | 'draw') => {
        if (!canvas) return;
        canvas.isDrawingMode = mode === 'draw';
        canvas.selection = mode === 'select';

        if (mode === 'draw') {
            canvas.freeDrawingBrush.width = 5;
            canvas.freeDrawingBrush.color = '#000000';
        }
    };

    const addLocalImage = () => {
        if (!canvas) return;
        window.fabric.Image.fromURL('/images/photo-edit-sample-image.png', (img: any) => {
            img.scaleToWidth(400);
            canvas.add(img);
            canvas.renderAll();
        });
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && canvas) {
            const reader = new FileReader();
            reader.onload = (e) => {
                window.fabric.Image.fromURL(e.target?.result as string, (img: any) => {
                    img.scaleToWidth(400);
                    canvas.add(img);
                    canvas.renderAll();
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const addText = () => {
        if (!canvas) return;
        const text = new window.fabric.IText('Edit me', {
            left: 100,
            top: 100,
            fontFamily: 'Arial',
            fill: '#000000',
            fontSize: 20
        });
        canvas.add(text);
        canvas.renderAll();
    };

    const removeSelected = () => {
        if (!canvas) return;
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            canvas.remove(activeObject);
            canvas.renderAll();
        }
    };

    const cutSelected = () => {
        if (!canvas) return;
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            setCopiedObject(activeObject);
            canvas.remove(activeObject);
            canvas.renderAll();
        }
    };

    const pasteObject = () => {
        if (!canvas || !copiedObject) return;
        copiedObject.clone((clonedObj: any) => {
            canvas.discardActiveObject();
            clonedObj.set({
                left: clonedObj.left + 10,
                top: clonedObj.top + 10,
                evented: true,
            });
            if (clonedObj.type === 'activeSelection') {
                clonedObj.canvas = canvas;
                clonedObj.forEachObject((obj: any) => canvas.add(obj));
                clonedObj.setCoords();
            } else {
                canvas.add(clonedObj);
            }
            canvas.setActiveObject(clonedObj);
            canvas.renderAll();
        });
    };

    const applyFilter = (filterType: 'grayscale' | 'invert' | 'sepia') => {
        if (!canvas) return;
        const activeObject = canvas.getActiveObject();
        if (!activeObject || !(activeObject instanceof window.fabric.Image)) return;

        let filter;
        switch (filterType) {
            case 'grayscale':
                filter = new window.fabric.Image.filters.Grayscale();
                break;
            case 'invert':
                filter = new window.fabric.Image.filters.Invert();
                break;
            case 'sepia':
                filter = new window.fabric.Image.filters.Sepia();
                break;
        }

        activeObject.filters?.push(filter);
        activeObject.applyFilters();
        canvas.renderAll();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-lg"
        >
            <div className="mb-4 grid grid-cols-5 gap-4">
                <ToolButton icon="mdi:cursor-default" text="Select" onClick={() => setMode('select')} />
                <ToolButton icon="mdi:pencil" text="Draw" onClick={() => setMode('draw')} />
                <ToolButton icon="mdi:image-plus" text="Add Image" onClick={addLocalImage} />
                <ToolButton icon="mdi:format-text" text="Add Text" onClick={addText} />
                <ToolButton icon="mdi:delete" text="Remove Selected" onClick={removeSelected} />
                <ToolButton icon="mdi:upload" text="Upload Image" onClick={() => fileInputRef.current?.click()} />
                <ToolButton icon="mdi:content-cut" text="Cut" onClick={cutSelected} />
                <ToolButton icon="mdi:content-paste" text="Paste" onClick={pasteObject} />
                <ToolButton icon="mdi:image-filter-black-white" text="Grayscale" onClick={() => applyFilter('grayscale')} />
                <ToolButton icon="mdi:invert-colors" text="Invert" onClick={() => applyFilter('invert')} />
                <ToolButton icon="mdi:filter-vintage" text="Sepia" onClick={() => applyFilter('sepia')} />
            </div>
            <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
            />
            <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <canvas id="canvas" className="border border-gray-300 dark:border-gray-600 rounded shadow-md" />
            </motion.div>
            <div className="mt-4 flex space-x-4">
                <FreeFormSelection canvas={canvas} />
                <CutPasteTool canvas={canvas} />
                <OpacityTool canvas={canvas} />
                <LayerManagement canvas={canvas} />
                <ToolButton icon="mdi:vector-polygon" text="Free-form Selection" onClick={() => {/* Implement free-form selection */}} />
                <ToolButton icon="mdi:content-cut" text="Cut" onClick={cutSelected} />
                <ToolButton icon="mdi:content-paste" text="Paste" onClick={pasteObject} />
                <ToolButton icon="mdi:opacity" text="Opacity" onClick={() => {/* Implement opacity tool */}} />
                <ToolButton icon="mdi:layers" text="Layer Management" onClick={() => {/* Implement layer management */}} />
            </div>
        </motion.div>
    );
};

export default AdvancedImageEditor;
