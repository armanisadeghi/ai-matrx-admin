'use client';

import React, { useState, useEffect } from 'react';

const OrbitalSelect = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [rotation, setRotation] = useState(0);

    const options = [
        "Mercury", "Venus", "Earth", "Mars", "Jupiter"
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setRotation(r => (r + 0.5) % 360);
        }, 20);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-64 h-64">
            {/* Orbital Paths */}
            <div className={`absolute inset-0 rounded-full border border-blue-200/20 transition-all duration-500
        ${isOpen ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />
            <div className={`absolute inset-2 rounded-full border border-blue-200/15 transition-all duration-500 delay-100
        ${isOpen ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />

            {/* Options */}
            {isOpen && options.map((option, i) => {
                const angle = (i * 360) / options.length + rotation;
                const radius = 80;
                const x = Math.cos((angle * Math.PI) / 180) * radius;
                const y = Math.sin((angle * Math.PI) / 180) * radius;

                return (
                    <button
                        key={option}
                        onClick={() => {
                            setSelected(option);
                            setIsOpen(false);
                        }}
                        className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2
              transition-all duration-300 w-12 h-12 rounded-full
              ${option === selected ? 'bg-blue-500' : 'bg-blue-400/20'}
              hover:scale-110`}
                        style={{
                            transform: `translate(${x}px, ${y}px)`,
                        }}
                    >
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
                        <span className="text-white text-xs">{option}</span>
                    </button>
                );
            })}

            {/* Central Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2
          w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600
          transition-all duration-300 hover:scale-110"
            >
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
                <span className="text-white text-sm">{selected || 'Select'}</span>

                {/* Pulse Rings */}
                {[...Array(3)].map((_, i) => (
                    <div
                        key={i}
                        className={`absolute inset-0 rounded-full border border-blue-400/30
              transition-all duration-1000 ${isOpen ? 'scale-150 opacity-0' : 'scale-100 opacity-100'}`}
                        style={{
                            animationDelay: `${i * 200}ms`,
                            transform: `scale(${1 + (i * 0.2)})`,
                        }}
                    />
                ))}
            </button>
        </div>
    );
};

const PortalSelect = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [hovered, setHovered] = useState(null);

    const options = [
        "Dream", "Reality", "Fantasy", "Mystery", "Wonder"
    ];

    return (
        <div className="relative w-64">
            {/* Main Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-12 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500
          relative overflow-hidden group"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/50 to-pink-600/50
          opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative z-10 text-white font-medium">
                    {selected || 'Choose Dimension'}
                </div>

                {/* Portal Effect */}
                <div className={`absolute inset-0 transition-all duration-500
          ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute inset-0 rounded-lg"
                            style={{
                                border: '1px solid rgba(255,255,255,0.1)',
                                transform: `scale(${1 + (i * 0.05)})`,
                                opacity: 1 - (i * 0.2),
                            }}
                        />
                    ))}
                </div>
            </button>

            {/* Options Portal */}
            <div className={`absolute w-full mt-2 transition-all duration-500 overflow-hidden
        ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                {options.map((option, i) => (
                    <button
                        key={option}
                        onMouseEnter={() => setHovered(option)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => {
                            setSelected(option);
                            setIsOpen(false);
                        }}
                        className="w-full h-12 relative group"
                    >
                        <div className={`absolute inset-0 bg-gradient-to-r from-purple-500/80 to-pink-500/80
              transition-all duration-300
              ${hovered === option ? 'opacity-100' : 'opacity-0'}`}
                             style={{
                                 transform: `translateY(${i * 100}%)`,
                             }}
                        />

                        <div className="relative z-10 text-white font-medium
              transition-transform duration-300 group-hover:scale-110">
                            {option}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

const CrystalSelect = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [energy, setEnergy] = useState(0);

    const options = [
        "Ruby", "Sapphire", "Emerald", "Diamond", "Amethyst"
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setEnergy(e => (e + 0.1) % (Math.PI * 2));
        }, 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-64">
            {/* Crystal Container */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-16 relative overflow-hidden rounded-lg
          bg-gradient-to-br from-cyan-900/50 to-blue-900/50"
            >
                {/* Crystal Facets */}
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"
                        style={{
                            clipPath: `polygon(
                ${50 + Math.cos((i * Math.PI) / 3) * 50}% ${50 + Math.sin((i * Math.PI) / 3) * 50}%,
                ${50 + Math.cos(((i + 1) * Math.PI) / 3) * 50}% ${50 + Math.sin(((i + 1) * Math.PI) / 3) * 50}%,
                50% 50%
              )`,
                            transform: `scale(${1 + Math.sin(energy + i) * 0.1})`,
                            transition: 'transform 0.3s ease-out',
                        }}
                    />
                ))}

                {/* Energy Lines */}
                <div className="absolute inset-0">
                    {[...Array(3)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute inset-0 border border-cyan-400/30"
                            style={{
                                transform: `rotate(${(i * 60) + (energy * 30)}deg) scale(${0.8 + Math.sin(energy + i) * 0.2})`,
                                transition: 'transform 0.3s ease-out',
                            }}
                        />
                    ))}
                </div>

                <span className="relative z-10 text-cyan-100 font-medium">
          {selected || 'Select Crystal'}
        </span>
            </button>

            {/* Options List */}
            <div className={`absolute w-full mt-2 space-y-1 transition-all duration-500
        ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                {options.map((option, i) => (
                    <button
                        key={option}
                        onClick={() => {
                            setSelected(option);
                            setIsOpen(false);
                        }}
                        className="w-full h-12 relative overflow-hidden rounded-md
              bg-gradient-to-br from-cyan-900/30 to-blue-900/30
              hover:from-cyan-800/40 hover:to-blue-800/40
              transition-all duration-300 group"
                    >
                        {/* Crystal Energy */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            {[...Array(3)].map((_, j) => (
                                <div
                                    key={j}
                                    className="absolute inset-0 border border-cyan-400/20"
                                    style={{
                                        transform: `rotate(${(j * 60) + (energy * 30)}deg) scale(${0.8 + Math.sin(energy + j) * 0.2})`,
                                    }}
                                />
                            ))}
                        </div>

                        <span className="relative z-10 text-cyan-100 font-medium">
              {option}
            </span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const SelectShowcase = () => {
    return (
        <div className="space-y-16 p-8 bg-gray-900">
            <div>
                <h2 className="text-center mb-4 text-lg font-medium text-white">Orbital Selection</h2>
                <div className="flex justify-center">
                    <OrbitalSelect />
                </div>
            </div>
            <div>
                <h2 className="text-center mb-4 text-lg font-medium text-white">Dimensional Portal</h2>
                <div className="flex justify-center">
                    <PortalSelect />
                </div>
            </div>
            <div>
                <h2 className="text-center mb-4 text-lg font-medium text-white">Crystal Resonance</h2>
                <div className="flex justify-center">
                    <CrystalSelect />
                </div>
            </div>
        </div>
    );
};

export default SelectShowcase;
