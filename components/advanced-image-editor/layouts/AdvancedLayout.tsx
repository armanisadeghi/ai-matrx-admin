'use client';
import { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import React from 'react';
import {
    Image,
    Sliders,
    Type,
    Square,
    Upload,
    MoreHorizontal,
    ChevronLeft,
    ChevronRight,
    Download,
    Search,
    HelpCircle,
    Menu,
    Eye,
    Settings,
    Plus,
    Trash2,
    ArrowUp,
    ArrowDown,
    RotateCcw,
    RotateCw,
    ChevronDown,
    Wand2,
    Paintbrush,
    Shapes,
    Scissors,
    Sparkles,
    Smile,
    Frame,
    FileText,
    Layers,
    Blocks,
    CloudOff
} from 'lucide-react';

// TopBar Component
export const TopBar = ({ activeTab, setActiveTab, isToolPanelOpen, setIsToolPanelOpen, isLayersPanelOpen, setIsLayersPanelOpen, className = '' }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const editingModes = ['Image', 'Video', 'Animation', 'Icon', 'Graphic', '3D Object'];
    const tools = [
        { name: 'AI Tools', icon: Wand2 },
        { name: 'Adjust', icon: Sliders },
        { name: 'Paint', icon: Paintbrush },
        { name: 'Shapes', icon: Shapes },
        { name: 'Mask', icon: CloudOff },
        { name: 'Retouch', icon: Scissors },
        { name: 'Effects', icon: Sparkles },
        { name: 'Beauty', icon: Smile },
        { name: 'Frames', icon: Frame },
        { name: 'Text', icon: FileText },
        { name: 'Elements', icon: Blocks },
        { name: 'Levels', icon: Sliders },
    ];

    return (
        <div className={cn("flex justify-between items-center p-2 bg-gray-800 text-white", className)}>
            <div className="flex items-center space-x-2 overflow-x-auto">
                <button
                    onClick={() => setIsToolPanelOpen(!isToolPanelOpen)}
                    className="p-1 hover:bg-gray-700 rounded transition-all duration-200"
                >
                    <Menu className="w-4 h-4" />
                </button>
                {tools.map(({ icon: Icon, name }) => (
                    <button
                        key={name}
                        className={`p-1 rounded transition-all duration-200 ${
                            activeTab === name ? 'bg-blue-500' : 'hover:bg-gray-700'
                        }`}
                        onClick={() => {
                            setActiveTab(name);
                            setIsToolPanelOpen(true);
                        }}
                    >
                        <Icon className="w-4 h-4" />
                    </button>
                ))}
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center p-1 hover:bg-gray-700 rounded transition-all duration-200"
                    >
                        <span className="mr-1 text-sm">Image</span>
                        <ChevronDown className="w-4 h-4" />
                    </button>
                    {isDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded shadow-lg z-10">
                            {editingModes.map((mode) => (
                                <button
                                    key={mode}
                                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-all duration-200"
                                    onClick={() => setIsDropdownOpen(false)}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center space-x-3">
                <RotateCcw className="w-4 h-4 hover:text-blue-400 transition-all duration-200 cursor-pointer" />
                <RotateCw className="w-4 h-4 hover:text-blue-400 transition-all duration-200 cursor-pointer" />
                <Upload className="w-4 h-4 hover:text-green-400 transition-all duration-200 cursor-pointer" />
                <Download className="w-4 h-4 hover:text-green-400 transition-all duration-200 cursor-pointer" />
                <Search className="w-4 h-4 hover:text-yellow-400 transition-all duration-200 cursor-pointer" />
                <button
                    onClick={() => setIsLayersPanelOpen(!isLayersPanelOpen)}
                    className="p-1 hover:bg-gray-700 rounded transition-all duration-200"
                >
                    <Layers className="w-4 h-4" />
                </button>
                <HelpCircle className="w-4 h-4 hover:text-yellow-400 transition-all duration-200 cursor-pointer" />
            </div>
        </div>
    );
};

// ToolPanel Component
export const ToolPanel = ({ activeTab, isToolPanelOpen, className = '' }) => {
    const toolSets = {
        'AI Tools': [
            { icon: Wand2, text: 'AI Enhance' },
            { icon: Scissors, text: 'Remove Background' },
            { icon: Image, text: 'Smart Crop' },
        ],
        'Adjust': [
            { icon: Sliders, text: 'Brightness & Contrast' },
            { icon: Image, text: 'Hue & Saturation' },
            { icon: Square, text: 'Crop' },
        ],
        'Paint': [
            { icon: Paintbrush, text: 'Brush' },
            { icon: Square, text: 'Eraser' },
            { icon: ChevronDown, text: 'Fill' },
        ],
        // Add more tool sets for each category...
    };

    const ToolButton = ({ icon: Icon, text, className = '' }) => (
        <button className={cn("flex items-center w-full p-2 text-left hover:bg-gray-700 rounded transition-all duration-200", className)}>
            <Icon className="w-4 h-4 mr-2" />
            <span>{text}</span>
            <ChevronRight className="w-4 h-4 ml-auto" />
        </button>
    );

    return (
        <div className={cn("w-48 bg-gray-800 overflow-y-auto transition-all duration-300 absolute top-0 bottom-0 left-0", isToolPanelOpen ? 'translate-x-0' : '-translate-x-full', className)}>
            <div className="p-2 border-b border-gray-700">
                <h2 className="font-bold text-sm">{activeTab}</h2>
            </div>
            <div className="space-y-1 p-2">
                {toolSets[activeTab]?.map((tool, index) => (
                    <ToolButton key={index} icon={tool.icon} text={tool.text} />
                ))}
            </div>
        </div>
    );
};

// LayerItem Component
export const LayerItem = ({ name, visible, thumbnail, className = '' }) => (
    <div className={cn("flex items-center space-x-2 p-1 hover:bg-gray-700 rounded transition-all duration-200", className)}>
        <Eye className={`w-4 h-4 ${visible ? 'text-blue-400' : 'text-gray-400'}`} />
        <img src={thumbnail} alt={name} className="w-8 h-8 object-cover" />
        <div className="flex-1 text-sm">{name}</div>
        <Settings className="w-4 h-4" />
    </div>
);

// LayersPanel Component
export const LayersPanel = ({ isLayersPanelOpen, className = '' }) => {
    const layers = [
        { name: 'Background', visible: true, thumbnail: '/api/placeholder/32/32' },
        { name: 'Layer 1', visible: true, thumbnail: '/api/placeholder/32/32' },
        { name: 'Layer 2', visible: false, thumbnail: '/api/placeholder/32/32' },
    ];

    return (
        <div className={cn("w-64 bg-gray-800 flex flex-col transition-all duration-300 absolute top-0 bottom-0 right-0", isLayersPanelOpen ? 'translate-x-0' : 'translate-x-full', className)}>
            <div className="p-2 border-b border-gray-700">
                <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm">Layers</span>
                    <div className="flex space-x-1">
                        <Plus className="w-4 h-4 hover:text-blue-400 transition-all duration-200 cursor-pointer" />
                        <Trash2 className="w-4 h-4 hover:text-red-400 transition-all duration-200 cursor-pointer" />
                        <ArrowUp className="w-4 h-4 hover:text-green-400 transition-all duration-200 cursor-pointer" />
                        <ArrowDown className="w-4 h-4 hover:text-green-400 transition-all duration-200 cursor-pointer" />
                        <MoreHorizontal className="w-4 h-4 hover:text-yellow-400 transition-all duration-200 cursor-pointer" />
                    </div>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                    <span>Blend:</span>
                    <select className="bg-gray-700 rounded px-1 py-0.5 w-16 text-xs appearance-none cursor-pointer">
                        <option>Normal</option>
                    </select>
                    <span>Opacity:</span>
                    <select className="bg-gray-700 rounded px-1 py-0.5 w-12 text-xs appearance-none cursor-pointer">
                        <option>100%</option>
                    </select>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {layers.map((layer, index) => (
                    <LayerItem key={index} {...layer} />
                ))}
            </div>
        </div>
    );
};

// Canvas Component
export const Canvas = ({ isToolPanelOpen, isLayersPanelOpen, className = '' }) => {
    const [canvasStyle, setCanvasStyle] = useState({});

    useEffect(() => {
        setCanvasStyle({
            left: isToolPanelOpen ? '12rem' : '0',
            right: isLayersPanelOpen ? '16rem' : '0',
            transition: 'left 0.3s, right 0.3s'
        });
    }, [isToolPanelOpen, isLayersPanelOpen]);

    return (
        <div className={cn("flex-1 overflow-hidden relative", className)}>
            <div className="absolute inset-0 bg-checkerboard"></div>
            <div style={canvasStyle} className="absolute inset-0">
                <img
                    src="/api/placeholder/1200/800"
                    alt="Editor Canvas"
                    className="w-full h-full object-contain"
                />
            </div>
        </div>
    );
};

// BottomMenu Component
export const BottomMenu = ({className = ''}) => (
    <div className={cn("absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-800 px-3 py-1 rounded-full shadow-lg transition-all duration-200 hover:scale-105", className)}>
        <ul className="flex space-x-4 text-xs">
            <li className="hover:text-blue-400 transition-all duration-200 cursor-pointer">AI Enhance</li>
            <li className="hover:text-blue-400 transition-all duration-200 cursor-pointer">Remove BG</li>
            <li className="hover:text-blue-400 transition-all duration-200 cursor-pointer">Smart Crop</li>
            <li className="hover:text-blue-400 transition-all duration-200 cursor-pointer">Auto Correct</li>
            <li className="hover:text-blue-400 transition-all duration-200 cursor-pointer">Face Retouch</li>
        </ul>
    </div>
);
