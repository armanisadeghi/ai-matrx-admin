'use client';

import React, { useState, useEffect } from 'react';

const BionicGlass = () => {
    const [hovered, setHovered] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [dataPoints, setDataPoints] = useState([]);

    useEffect(() => {
        // Generate random data points
        const points = Array.from({ length: 20 }, () => ({
            x: Math.random() * 100,
            y: Math.random() * 100,
            value: Math.random(),
        }));
        setDataPoints(points);
    }, []);

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setMousePos({ x, y });
    };

    return (
        <div
            className="relative w-96 h-64 rounded-xl overflow-hidden"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Background Layer */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-900 to-blue-900" />

            {/* Data Visualization Layer */}
            <div className="absolute inset-0">
                <svg width="100%" height="100%" className="transform scale-110">
                    {dataPoints.map((point, i) => (
                        <circle
                            key={i}
                            cx={`${point.x}%`}
                            cy={`${point.y}%`}
                            r={point.value * 4 + 2}
                            className="fill-cyan-400/30"
                            style={{
                                transform: `translate(${
                                    (mousePos.x - point.x) * 0.02
                                }px, ${
                                    (mousePos.y - point.y) * 0.02
                                }px)`,
                                transition: 'transform 0.3s ease-out',
                            }}
                        />
                    ))}
                </svg>
            </div>

            {/* Glass Layer */}
            <div className="absolute inset-0 backdrop-blur-sm bg-white/10">
                {/* Glass Reflections */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.15),transparent)]" />
            </div>

            {/* Interactive Highlight */}
            <div
                className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]"
                style={{
                    transform: `translate(${mousePos.x - 50}px, ${mousePos.y - 50}px)`,
                    opacity: hovered ? 1 : 0,
                    transition: 'opacity 0.3s ease-out',
                }}
            />

            {/* Content */}
            <div className="relative p-6 text-white">
                <h3 className="text-xl font-semibold mb-2">Bionic Interface</h3>
                <p className="text-sm text-blue-100/80">Advanced neural processing active</p>
            </div>
        </div>
    );
};

const QuantumGlassTerminal = () => {
    const [text, setText] = useState('');
    const [particles, setParticles] = useState([]);
    const placeholder = "Enter quantum sequence...";

    useEffect(() => {
        const generateParticles = () => {
            const newParticles = Array.from({ length: 15 }, () => ({
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: Math.random() * 3 + 1,
                speed: Math.random() * 2 + 1,
            }));
            setParticles(newParticles);
        };

        generateParticles();
        const interval = setInterval(generateParticles, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-96 h-64 mt-12 rounded-xl overflow-hidden">
            {/* Quantum Field Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900 to-indigo-900">
                {particles.map((particle, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full bg-purple-400/30"
                        style={{
                            left: `${particle.x}%`,
                            top: `${particle.y}%`,
                            width: `${particle.size}px`,
                            height: `${particle.size}px`,
                            animation: `float ${particle.speed}s infinite alternate`,
                        }}
                    />
                ))}
            </div>

            {/* Primary Glass Layer */}
            <div className="absolute inset-0 backdrop-blur-md bg-white/10">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            </div>

            {/* Terminal Content */}
            <div className="relative p-6">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-transparent border-none outline-none text-white placeholder-white/50 font-mono"
                />

                {/* Quantum Interference Pattern */}
                <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden">
                    <svg width="100%" height="100%" className="transform translate-y-12">
                        <path
                            d={`M 0 50 ${Array.from({ length: 10 }, (_, i) =>
                                `Q ${i * 40 + 20} ${40 + Math.sin(Date.now() / 1000 + i) * 20} ${i * 40 + 40} 50`
                            ).join(' ')}`}
                            fill="none"
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="1"
                        />
                    </svg>
                </div>
            </div>

            {/* Secondary Glass Layer */}
            <div className="absolute inset-x-4 top-4 h-12 rounded-lg overflow-hidden">
                <div className="absolute inset-0 backdrop-blur-sm bg-white/5" />
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
                <div className="relative px-4 py-2 text-white/70 font-mono text-sm">
                    &gt; quantum_shell v2.0
                </div>
            </div>
        </div>
    );
};

const CrystallineDataCard = () => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    const data = [
        { label: 'Energy', value: 89 },
        { label: 'Resonance', value: 64 },
        { label: 'Harmony', value: 72 }
    ];

    return (
        <div
            className="relative w-96 h-64 mt-12 rounded-xl overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Crystal Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-teal-900">
                {/* Crystal Facets */}
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute inset-0"
                        style={{
                            background: `linear-gradient(${i * 60}deg, rgba(255,255,255,0.1), transparent)`,
                            transform: `rotate(${i * 60 + (isHovered ? 30 : 0)}deg)`,
                            transition: 'transform 0.5s ease-out',
                        }}
                    />
                ))}
            </div>

            {/* Primary Glass Layer */}
            <div className="absolute inset-0 backdrop-blur-md bg-white/10">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative p-6 text-white">
                <h3 className="text-xl font-semibold mb-4">Crystal Matrix</h3>

                {/* Data Metrics */}
                <div className="space-y-4">
                    {data.map((item, index) => (
                        <div
                            key={index}
                            className="relative"
                            onMouseEnter={() => setActiveIndex(index)}
                        >
                            <div className="flex justify-between mb-1">
                                <span className="text-sm">{item.label}</span>
                                <span className="text-sm">{item.value}%</span>
                            </div>

                            {/* Glass Progress Bar */}
                            <div className="h-2 rounded-full overflow-hidden backdrop-blur-sm bg-white/10">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-500"
                                    style={{ width: `${item.value}%` }}
                                />
                            </div>

                            {/* Glow Effect */}
                            {activeIndex === index && (
                                <div className="absolute inset-0 bg-emerald-400/20 blur-lg" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Decorative Glass Elements */}
            <div className="absolute top-4 right-4 w-16 h-16">
                <div className="absolute inset-0 backdrop-blur-lg bg-white/10 rounded-full" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full" />
            </div>
        </div>
    );
};

const GlassShowcase = () => {
    return (
        <div className="space-y-12 p-8 bg-gray-900">
            <div>
                <h2 className="text-center mb-4 text-lg font-medium text-white">Bionic Glass Interface</h2>
                <div className="flex justify-center">
                    <BionicGlass />
                </div>
            </div>
            <div>
                <h2 className="text-center mb-4 text-lg font-medium text-white">Quantum Glass Terminal</h2>
                <div className="flex justify-center">
                    <QuantumGlassTerminal />
                </div>
            </div>
            <div>
                <h2 className="text-center mb-4 text-lg font-medium text-white">Crystalline Data Card</h2>
                <div className="flex justify-center">
                    <CrystallineDataCard />
                </div>
            </div>
        </div>
    );
};

export default GlassShowcase;
