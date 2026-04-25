'use client';

import React, { useState, useEffect } from 'react';

const Orbit3DToggle = () => {
    const [isOn, setIsOn] = useState(false);
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setRotation(r => (r + 1) % 360);
        }, 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative h-48 w-48">
            {/* Orbital Rings */}
            <div className="absolute inset-0 rounded-full border-2 border-blue-200/30 transform rotate-45" />
            <div className="absolute inset-0 rounded-full border-2 border-blue-200/20 transform -rotate-45" />

            {/* Floating Particles */}
            {[...Array(8)].map((_, i) => (
                <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-blue-400/40"
                    style={{
                        left: '50%',
                        top: '50%',
                        transform: `rotate(${rotation + (i * 45)}deg) translateX(${isOn ? '80px' : '40px'}) translateY(-50%)`,
                        transition: 'transform 0.5s ease-out',
                    }}
                />
            ))}

            {/* Core Button */}
            <button
                onClick={() => setIsOn(!isOn)}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            >
                <div className={`relative w-20 h-20 rounded-full transition-all duration-500 
          ${isOn ? 'scale-110' : 'scale-100'}`}>
                    {/* Inner Core */}
                    <div className={`absolute inset-0 rounded-full transition-all duration-500
            ${isOn
              ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
              : 'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600'}`
                    } />
                    {/* Energy Rings */}
                    <div className={`absolute inset-[-10px] rounded-full border-2 border-blue-400/30 
            transition-all duration-500 ${isOn ? 'scale-110 opacity-100' : 'scale-90 opacity-0'}`} />
                    <div className={`absolute inset-[-20px] rounded-full border-2 border-blue-400/20
            transition-all duration-500 ${isOn ? 'scale-110 opacity-100' : 'scale-90 opacity-0'}`} />
                </div>
            </button>
        </div>
    );
};

const WaveSlider = () => {
    const [value, setValue] = useState(50);
    const [points, setPoints] = useState<string[]>([]);

    useEffect(() => {
        const generateWave = () => {
            const newPoints = [];
            for (let i = 0; i <= 100; i++) {
                const x = i;
                const y = 50 + Math.sin((i / 10) + Date.now() / 1000) * 20;
                newPoints.push(`${x},${y}`);
            }
            setPoints(newPoints);
            requestAnimationFrame(generateWave);
        };
        generateWave();
    }, []);

    return (
        <div className="relative w-64 h-32">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="wave-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(59,130,246)" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="rgb(59,130,246)" stopOpacity="0.2" />
                    </linearGradient>
                </defs>
                <path
                    d={`M 0,100 L 0,${points[0]} ${points.map((point, i) => `L ${point}`).join(' ')} L 100,100 Z`}
                    fill="url(#wave-gradient)"
                    className="transition-all duration-300"
                />
            </svg>
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

const PulseButton = () => {
    const [isActive, setIsActive] = useState(false);

    return (
        <button
            onClick={() => setIsActive(!isActive)}
            className="relative w-32 h-32 rounded-full"
        >
            {/* Pulse Rings */}
            {[...Array(3)].map((_, i) => (
                <div
                    key={i}
                    className={`absolute inset-0 rounded-full border-2 border-purple-500
            transition-all duration-1000 ${isActive ? 'scale-150 opacity-0' : 'scale-100 opacity-100'}`}
                    style={{
                        animationDelay: `${i * 200}ms`,
                        transform: `scale(${1 + (i * 0.2)})`,
                    }}
                />
            ))}

            {/* Core Button */}
            <div className={`relative w-full h-full rounded-full transition-transform duration-300
        ${isActive ? 'transform scale-110' : ''}`}>
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600
          shadow-lg" />
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
                    PULSE
                </div>
            </div>
        </button>
    );
};

const ExperimentalShowcase = () => {
    return (
        <div className="space-y-16 p-8 bg-gray-900">
            <div>
                <h2 className="text-center mb-4 text-lg font-medium text-white">Orbital Toggle</h2>
                <div className="flex justify-center">
                    <Orbit3DToggle />
                </div>
            </div>
            <div>
                <h2 className="text-center mb-4 text-lg font-medium text-white">Wave Slider</h2>
                <div className="flex justify-center">
                    <WaveSlider />
                </div>
            </div>
            <div>
                <h2 className="text-center mb-4 text-lg font-medium text-white">Pulse Button</h2>
                <div className="flex justify-center">
                    <PulseButton />
                </div>
            </div>
        </div>
    );
};

export default ExperimentalShowcase;
