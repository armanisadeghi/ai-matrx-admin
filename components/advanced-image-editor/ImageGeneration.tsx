"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from 'next/image';

// Import the custom Fabric.js build
import '/vendors/fabric.js';

// Declare fabric as a global to satisfy TypeScript
declare global {
    interface Window {
        fabric: any;
    }
}

const AdvancedImageEditor: React.FC = () => {
    const [canvas, setCanvas] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Use the global fabric object
        const c = new window.fabric.Canvas("canvas", {
            width: 800,
            height: 600,
            backgroundColor: '#f0f0f0',
            // Set options directly here
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
        <div className="flex flex-col items-center">
            <div className="mb-4 space-x-2">
                <button onClick={() => setMode('select')} className="px-4 py-2 bg-blue-500 text-white rounded">Select</button>
                <button onClick={() => setMode('draw')} className="px-4 py-2 bg-green-500 text-white rounded">Draw</button>
                <button onClick={addLocalImage} className="px-4 py-2 bg-yellow-500 text-white rounded">Add Local Image</button>
                <button onClick={addText} className="px-4 py-2 bg-purple-500 text-white rounded">Add Text</button>
                <button onClick={removeSelected} className="px-4 py-2 bg-red-500 text-white rounded">Remove Selected</button>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    className="hidden"
                />
                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-pink-500 text-white rounded">
                    Upload Image
                </button>
            </div>
            <div className="mb-4 space-x-2">
                <button onClick={() => applyFilter('grayscale')} className="px-4 py-2 bg-gray-500 text-white rounded">Grayscale</button>
                <button onClick={() => applyFilter('invert')} className="px-4 py-2 bg-indigo-500 text-white rounded">Invert</button>
                <button onClick={() => applyFilter('sepia')} className="px-4 py-2 bg-orange-500 text-white rounded">Sepia</button>
            </div>
            <canvas id="canvas" />
            <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Preview of local image:</h3>
                <Image src="/images/photo-edit-sample-image.png" alt="Sample Image" width={400} height={300} />
            </div>
        </div>
    );
};

export default AdvancedImageEditor;
