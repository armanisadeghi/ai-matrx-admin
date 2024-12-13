'use client';

import React, { useState, useEffect } from 'react';

const QuantumStateToggle = () => {
    const [state, setState] = useState(0); // 0: neutral, 1: positive, -1: negative
    const [particles, setParticles] = useState([]);
    const [isObserved, setIsObserved] = useState(false);

    useEffect(() => {
        const generateParticles = () => {
            const newParticles = [];
            for (let i = 0; i < 24; i++) {
                const angle = (i * Math.PI * 2) / 24;
                const radius = state === 0 ? 50 : 60;
                newParticles.push({
                    x: Math.cos(angle) * radius,
                    y: Math.sin(angle) * radius,
                    opacity: Math.random(),
                    speed: 1 + Math.random(),
                });
            }
            setParticles(newParticles);
        };

        generateParticles();
        const interval = setInterval(generateParticles, 2000);
        return () => clearInterval(interval);
    }, [state]);

    return (
        <div className="relative w-64 h-64"
             onMouseEnter={() => setIsObserved(true)}
             onMouseLeave={() => setIsObserved(false)}>
            {/* Quantum Field */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-900/20 to-indigo-900/20" />

            {/* Probability Waves */}
            <svg className="absolute inset-0" viewBox="-100 -100 200 200">
                <defs>
                    <radialGradient id="quantum-gradient">
                        <stop offset="0%" stopColor="rgba(167, 139, 250, 0.3)" />
                        <stop offset="100%" stopColor="rgba(167, 139, 250, 0)" />
                    </radialGradient>
                </defs>

                {particles.map((particle, i) => (
                    <circle
                        key={i}
                        cx={particle.x}
                        cy={particle.y}
                        r={3}
                        fill="url(#quantum-gradient)"
                        style={{
                            animation: `quantum-flicker ${particle.speed}s infinite alternate`,
                            opacity: isObserved ? 1 : particle.opacity,
                            transition: 'all 0.3s ease-out',
                        }}
                    />
                ))}
            </svg>

            {/* Superposition Core */}
            <button
                onClick={() => setState(s => (s === 1 ? -1 : s + 1))}
                className="absolute top-1/2 left-1/2 w-24 h-24 transform -translate-x-1/2 -translate-y-1/2"
            >
                <div className={`relative w-full h-full rounded-full transition-all duration-700
          ${state === 0 ? 'bg-violet-600/50' : state === 1 ? 'bg-blue-600/50' : 'bg-red-600/50'}
          ${isObserved ? 'scale-110' : 'scale-100'}
        `}>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-transparent to-black/30" />

                    {/* Quantum State Indicator */}
                    <div className={`absolute inset-0 flex items-center justify-center text-white font-bold
            transition-all duration-700 ${isObserved ? 'opacity-100' : 'opacity-0'}`}>
                        {state === 0 ? '|ψ⟩' : state === 1 ? '|+⟩' : '|-⟩'}
                    </div>
                </div>
            </button>
        </div>
    );
};

const DimensionalPortal = () => {
    const [depth, setDepth] = useState(0);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const layers = 8;

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        setMousePos({ x, y });
    };

    return (
        <div
            className="relative w-64 h-64 cursor-pointer"
            onMouseMove={handleMouseMove}
            onClick={() => setDepth(d => (d + 1) % 3)}
        >
            {[...Array(layers)].map((_, i) => (
                <div
                    key={i}
                    className="absolute inset-0 rounded-full transition-all duration-500"
                    style={{
                        transform: `
              translate(
                ${mousePos.x * (i + 1) * 10}px,
                ${mousePos.y * (i + 1) * 10}px
              )
              scale(${1 - (i * 0.1) - (depth * 0.1)})
            `,
                        background: `
              radial-gradient(
                circle,
                rgba(${147 + (i * 20)}, ${51 + (i * 20)}, ${239 + (i * 20)}, ${1 - (i * 0.1)})
                ${20 + (i * 10)}%,
                transparent 100%
              )
            `,
                        zIndex: layers - i,
                    }}
                />
            ))}

            {/* Portal Core */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm
          transition-transform duration-500
          transform ${depth > 0 ? 'scale-75' : 'scale-100'}`}>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20" />
                </div>
            </div>
        </div>
    );
};

const TimecrystalControl = () => {
    const [phase, setPhase] = useState(0);
    const [rotation, setRotation] = useState(0);
    const crystalCount = 6;

    useEffect(() => {
        const interval = setInterval(() => {
            setRotation(r => (r + 1) % 360);
        }, 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-64 h-64" onClick={() => setPhase(p => (p + 1) % 4)}>
            {/* Time Crystal Structure */}
            {[...Array(crystalCount)].map((_, i) => (
                <div
                    key={i}
                    className="absolute inset-0"
                    style={{
                        transform: `rotate(${(360 / crystalCount) * i + rotation}deg)`,
                    }}
                >
                    <div
                        className="absolute top-0 left-1/2 w-1 h-1/2 origin-bottom transition-all duration-700"
                        style={{
                            transform: `scaleY(${1 + Math.sin(phase + (i / crystalCount) * Math.PI * 2) * 0.3})`,
                        }}
                    >
                        <div className="w-full h-full bg-gradient-to-t from-cyan-500/0 via-cyan-500/50 to-white/80" />
                    </div>
                </div>
            ))}

            {/* Temporal Core */}
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-cyan-900/30 to-blue-900/30 backdrop-blur-sm">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-transparent to-black/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`text-cyan-300/80 font-mono text-2xl transform transition-all duration-700
            ${phase % 2 === 0 ? 'scale-100' : 'scale-90'}`}>
                        τ{phase}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AvantGardeShowcase = () => {
    return (
        <div className="space-y-16 p-8 bg-gray-900">
            <div>
                <h2 className="text-center mb-4 text-lg font-medium text-white">Quantum State Observer</h2>
                <div className="flex justify-center">
                    <QuantumStateToggle />
                </div>
            </div>
            <div>
                <h2 className="text-center mb-4 text-lg font-medium text-white">Dimensional Gateway</h2>
                <div className="flex justify-center">
                    <DimensionalPortal />
                </div>
            </div>
            <div>
                <h2 className="text-center mb-4 text-lg font-medium text-white">Time Crystal Interface</h2>
                <div className="flex justify-center">
                    <TimecrystalControl />
                </div>
            </div>
        </div>
    );
};

export default AvantGardeShowcase;
