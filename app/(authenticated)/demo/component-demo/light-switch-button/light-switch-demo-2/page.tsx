'use client';

import React, { useState, useEffect } from 'react';

const Enhanced3DToggle = () => {
    const [isOn, setIsOn] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className="relative flex items-center justify-center space-x-4">
            {/* Status Indicator */}
            <div className={`w-3 h-3 rounded-full transition-all duration-500 ${
                isOn ? 'bg-green-500 shadow-[0_0_8px_2px_rgba(34,197,94,0.6)]' : 'bg-red-500'
            }`} />

            <div
                className="relative flex w-48 h-16 bg-gray-200 rounded-full shadow-inner overflow-hidden"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Hover Glow Effect */}
                <div className={`absolute inset-0 transition-opacity duration-300 ${
                    isHovered ? 'opacity-100' : 'opacity-0'
                } bg-gradient-to-r from-transparent via-white to-transparent blur-md`} />

                {/* Center Line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-gray-300 transform -translate-x-1/2 z-10" />

                <button
                    onClick={() => setIsOn(false)}
                    className={`relative w-1/2 h-full transition-all duration-300 ${
                        !isOn
                        ? 'bg-gray-500 transform active:translate-y-1'
                        : 'bg-gray-100 transform -translate-y-1'
                    }`}
                >
                    <div className={`absolute inset-0 rounded-l-full border-r border-gray-300 ${
                        !isOn
                        ? 'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600'
                        : 'bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300'
                    }`} />
                    <span className={`relative z-20 font-medium ${
                        !isOn ? 'text-white' : 'text-gray-500'
                    }`}>OFF</span>
                </button>

                <button
                    onClick={() => setIsOn(true)}
                    className={`relative w-1/2 h-full transition-all duration-300 ${
                        isOn
                        ? 'bg-blue-500 transform active:translate-y-1'
                        : 'bg-gray-100 transform -translate-y-1'
                    }`}
                >
                    <div className={`absolute inset-0 rounded-r-full border-l border-gray-300 ${
                        isOn
                        ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600'
                        : 'bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300'
                    }`} />
                    <span className={`relative z-20 font-medium ${
                        isOn ? 'text-white' : 'text-gray-500'
                    }`}>ON</span>
                </button>
            </div>
        </div>
    );
};

const PushButton = () => {
    const [isPressed, setIsPressed] = useState(false);

    return (
        <button
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            className={`relative w-32 h-32 rounded-full transition-all duration-150 ${
                isPressed ? 'transform translate-y-2' : ''
            }`}
        >
            <div className="absolute inset-0 rounded-full bg-red-500 shadow-lg"
                 style={{ transform: 'translateY(8px)' }} />
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-red-400 via-red-500 to-red-600 
        shadow-lg transition-transform duration-150 ${isPressed ? 'transform translate-y-2' : ''}`}>
        <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">
          PUSH
        </span>
            </div>
        </button>
    );
};

const Slider3D = () => {
    const [value, setValue] = useState(50);

    return (
        <div className="w-64 h-16 bg-gray-200 rounded-full shadow-inner relative overflow-hidden">
            <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-l-full transition-all duration-300"
                style={{ width: `${value}%` }}
            />
            <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="absolute inset-0 flex items-center justify-center text-white font-medium mix-blend-difference">
                {value}%
            </div>
        </div>
    );
};

const ControlsShowcase = () => {
    return (
        <div className="space-y-12 p-8 bg-gray-50">
            <div>
                <h2 className="text-center mb-4 text-lg font-medium">Enhanced Toggle Switch</h2>
                <Enhanced3DToggle />
            </div>
            <div>
                <h2 className="text-center mb-4 text-lg font-medium">3D Push Button</h2>
                <div className="flex justify-center">
                    <PushButton />
                </div>
            </div>
            <div>
                <h2 className="text-center mb-4 text-lg font-medium">3D Slider</h2>
                <div className="flex justify-center">
                    <Slider3D />
                </div>
            </div>
        </div>
    );
};

export default ControlsShowcase;
