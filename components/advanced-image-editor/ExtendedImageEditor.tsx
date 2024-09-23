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

    const applyFilter = (filterType: 'grayscale' | 'invert' | 'sepia' | 'brightness' | 'contrast' | 'saturation' | 'blur' | 'noise' | 'pixelate' | 'removeColor' | 'hueRotation' | 'gamma' | 'blendColor' | 'blendImage') => {
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
            case 'brightness':
                filter = new window.fabric.Image.filters.Brightness({ brightness: 0.1 }); // Adjust brightness value
                break;
            case 'contrast':
                filter = new window.fabric.Image.filters.Contrast({ contrast: 0.2 }); // Adjust contrast value
                break;
            case 'saturation':
                filter = new window.fabric.Image.filters.Saturation({ saturation: 0.3 }); // Adjust saturation value
                break;
            case 'blur':
                filter = new window.fabric.Image.filters.Blur({ blur: 0.5 }); // Adjust blur value
                break;
            case 'noise':
                filter = new window.fabric.Image.filters.Noise({ noise: 50 }); // Adjust noise value
                break;
            case 'pixelate':
                filter = new window.fabric.Image.filters.Pixelate({ blocksize: 8 }); // Adjust pixelation block size
                break;
            case 'removeColor':
                filter = new window.fabric.Image.filters.RemoveColor({ color: '#FFFFFF', distance: 0.1 }); // Adjust color and distance
                break;
            case 'hueRotation':
                filter = new window.fabric.Image.filters.HueRotation({ rotation: 0.5 }); // Adjust hue rotation value
                break;
            case 'gamma':
                filter = new window.fabric.Image.filters.Gamma({ gamma: [1.2, 1, 1] }); // Adjust gamma values
                break;
            case 'blendColor':
                filter = new window.fabric.Image.filters.BlendColor({ color: '#FF0000', mode: 'multiply', alpha: 0.5 }); // Adjust color, mode, and alpha
                break;
            case 'blendImage':
                // You'll need to create a fabric.Image object for 'blendImage'
                // let blendImage = new window.fabric.Image(...); // Create the image
                // filter = new window.fabric.Image.filters.BlendImage({ image: blendImage, mode: 'multiply', alpha: 0.5 });
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
                <button onClick={() => applyFilter('brightness')} className="px-4 py-2 bg-amber-500 text-white rounded">Brightness</button>
                <button onClick={() => applyFilter('contrast')} className="px-4 py-2 bg-lime-500 text-white rounded">Contrast</button>
                <button onClick={() => applyFilter('saturation')} className="px-4 py-2 bg-cyan-500 text-white rounded">Saturation</button>
                <button onClick={() => applyFilter('blur')} className="px-4 py-2 bg-blue-500 text-white rounded">Blur</button>
                <button onClick={() => applyFilter('noise')} className="px-4 py-2 bg-green-500 text-white rounded">Noise</button>
                <button onClick={() => applyFilter('pixelate')} className="px-4 py-2 bg-yellow-500 text-white rounded">Pixelate</button>
                <button onClick={() => applyFilter('removeColor')} className="px-4 py-2 bg-purple-500 text-white rounded">Remove Color</button>
                <button onClick={() => applyFilter('hueRotation')} className="px-4 py-2 bg-pink-500 text-white rounded">Hue Rotation</button>
                <button onClick={() => applyFilter('gamma')} className="px-4 py-2 bg-red-500 text-white rounded">Gamma</button>
                <button onClick={() => applyFilter('blendColor')} className="px-4 py-2 bg-teal-500 text-white rounded">Blend Color</button>
                {/* <button onClick={() => applyFilter('blendImage')} className="px-4 py-2 bg-gray-500 text-white rounded">Blend Image</button> */}
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
