'use client';

import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

// https://claude.ai/chat/0c31b143-10ff-44ac-bb1d-d016dba98e6e

// Types
interface BaseProps {
    className?: string;
    disabled?: boolean;
    onChange?: (value: any) => void;
}

interface OrbitToggleProps extends BaseProps {
    size?: 'sm' | 'md' | 'lg';
    color?: 'primary' | 'secondary' | 'accent';
    particleCount?: number;
    defaultValue?: boolean;
}

interface WaveSliderProps extends BaseProps {
    min?: number;
    max?: number;
    defaultValue?: number;
    showValue?: boolean;
    color?: 'primary' | 'secondary' | 'accent';
}

interface PulseButtonProps extends BaseProps {
    label?: string;
    size?: 'sm' | 'md' | 'lg';
    color?: 'primary' | 'secondary' | 'accent';
    pulseRings?: number;
}

const Orbit3DToggle = ({
                           size = 'md',
                           color = 'primary',
                           particleCount = 8,
                           defaultValue = false,
                           disabled = false,
                           onChange,
                           className,
                       }: OrbitToggleProps) => {
    const [isOn, setIsOn] = useState(defaultValue);
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setRotation(r => (r + 1) % 360);
        }, 50);
        return () => clearInterval(interval);
    }, []);

    const handleToggle = () => {
        if (disabled) return;
        const newState = !isOn;
        setIsOn(newState);
        onChange?.(newState);
    };

    const sizeClasses = {
        sm: 'h-32 w-32',
        md: 'h-48 w-48',
        lg: 'h-64 w-64',
    }[size];

    const buttonSizeClasses = {
        sm: 'w-16 h-16',
        md: 'w-20 h-20',
        lg: 'w-24 h-24',
    }[size];

    const colorClasses = {
        primary: 'border-primary/30 bg-primary',
        secondary: 'border-secondary/30 bg-secondary',
        accent: 'border-accent/30 bg-accent',
    }[color];

    return (
        <div className={cn(
            "relative",
            {
                'h-32 w-32': size === 'sm',
                'h-48 w-48': size === 'md',
                'h-64 w-64': size === 'lg',
            },
            disabled && "opacity-50 cursor-not-allowed",
            className
        )}>
            {/* Orbital Rings */}
            <div className={cn(
                "absolute inset-0 rounded-full border-2 transform rotate-45",
                {
                    'border-primary/30': color === 'primary',
                    'border-secondary/30': color === 'secondary',
                    'border-accent/30': color === 'accent',
                }
            )} />

            {/* Floating Particles */}
            {[...Array(particleCount)].map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        "absolute w-2 h-2 rounded-full",
                        color === 'primary' && "bg-primary/40",
                        color === 'secondary' && "bg-secondary/40",
                        color === 'accent' && "bg-accent/40"
                    )}
                    style={{
                        left: '50%',
                        top: '50%',
                        transform: `rotate(${rotation + (i * (360 / particleCount))}deg) translateX(${isOn ? '80px' : '40px'}) translateY(-50%)`,
                        transition: 'transform 0.5s ease-out',
                    }}
                />
            ))}

            {/* Core Button */}
            <button
                onClick={handleToggle}
                disabled={disabled}
                className={cn(
                    "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
                    buttonSizeClasses
                )}
            >
                <div className={cn(
                    "relative rounded-full transition-all duration-500",
                    isOn ? 'scale-110' : 'scale-100'
                )}>
                    {/* Inner Core */}
                    <div className={cn(
                        "absolute inset-0 rounded-full transition-all duration-500",
                        isOn ? [
                            color === 'primary' && "bg-gradient-to-br from-primary/90 via-primary to-primary/90 shadow-[0_0_20px_rgba(var(--primary)_/_0.5)]",
                            color === 'secondary' && "bg-gradient-to-br from-secondary/90 via-secondary to-secondary/90 shadow-[0_0_20px_rgba(var(--secondary)_/_0.5)]",
                            color === 'accent' && "bg-gradient-to-br from-accent/90 via-accent to-accent/90 shadow-[0_0_20px_rgba(var(--accent)_/_0.5)]",
                        ] : "bg-gradient-to-br from-muted/90 via-muted to-muted/90"
                    )} />

                    {/* Energy Rings */}
                    {[10, 20].map((offset, i) => (
                        <div
                            key={i}
                            className={cn(
                                "absolute rounded-full border-2 transition-all duration-500",
                                color === 'primary' && "border-primary/30",
                                color === 'secondary' && "border-secondary/30",
                                color === 'accent' && "border-accent/30",
                                isOn ? 'scale-110 opacity-100' : 'scale-90 opacity-0'
                            )}
                            style={{
                                inset: `-${offset}px`,
                            }}
                        />
                    ))}
                </div>
            </button>
        </div>
    );
};

const WaveSlider = ({
    min = 0,
    max = 100,
    defaultValue = 50,
    showValue = true,
    color = 'primary',
    disabled = false,
    onChange,
    className,
}: WaveSliderProps) => {
    const [value, setValue] = useState(defaultValue);
    const [points, setPoints] = useState<string[]>([]);
    const animationRef = React.useRef<number>();

    useEffect(() => {
        let startTime = Date.now();

        const generateWave = () => {
            const currentTime = Date.now();
            const elapsed = (currentTime - startTime) / 1000;

            const newPoints = [];
            for (let i = 0; i <= 100; i++) {
                const x = i;
                const y = 50 + Math.sin((i / 10) + elapsed * 2) * 30;
                newPoints.push(`${x},${y}`);
            }
            setPoints(newPoints);
            animationRef.current = requestAnimationFrame(generateWave);
        };

        generateWave();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseInt(e.target.value);
        setValue(newValue);
        onChange?.(newValue);
    };

    const colorClasses = {
        primary: 'fill-primary/80',
        secondary: 'fill-secondary/80',
        accent: 'fill-accent/80'
    }[color];

    return (
        <div className={cn(
            "relative w-64 h-32",
            disabled && "opacity-50 cursor-not-allowed",
            className
        )}>
            <svg
                className="w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
            >
                <path
                    d={points.length > 0 ? `M 0,100 L 0,${points[0]} ${points.map(point => `L ${point}`).join(' ')} L 100,100 Z` : ''}
                    className={cn(
                        "transition-all duration-300",
                        colorClasses
                    )}
                />
            </svg>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                disabled={disabled}
                onChange={handleChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {showValue && (
                <div className="absolute inset-0 flex items-center justify-center text-foreground font-medium">
                    {value}%
                </div>
            )}
        </div>
    );
};

const PulseButton = ({
                         label = 'PULSE',
                         size = 'md',
                         color = 'primary',
                         pulseRings = 3,
                         disabled = false,
                         onChange,
                         className,
                     }: PulseButtonProps) => {
    const [isActive, setIsActive] = useState(false);

    const handleClick = () => {
        if (disabled) return;
        setIsActive(!isActive);
        onChange?.(!isActive);
    };

    const sizeClasses = {
        sm: 'w-24 h-24 text-sm',
        md: 'w-32 h-32 text-base',
        lg: 'w-40 h-40 text-lg',
    }[size];

    const colorClasses = {
        primary: 'from-primary/90 via-primary to-primary/90 border-primary',
        secondary: 'from-secondary/90 via-secondary to-secondary/90 border-secondary',
        accent: 'from-accent/90 via-accent to-accent/90 border-accent',
    }[color];

    return (
        <button
            onClick={handleClick}
            disabled={disabled}
            className={cn(
                "relative rounded-full",
                sizeClasses,
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            {/* Pulse Rings */}
            {[...Array(pulseRings)].map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        "absolute inset-0 rounded-full border-2",
                        colorClasses,
                        "transition-all duration-1000",
                        isActive ? 'scale-150 opacity-0' : 'scale-100 opacity-100'
                    )}
                    style={{
                        animationDelay: `${i * 200}ms`,
                        transform: `scale(${1 + (i * 0.2)})`,
                    }}
                />
            ))}

            {/* Core Button */}
            <div className={cn(
                "relative w-full h-full rounded-full transition-transform duration-300",
                isActive && "transform scale-110"
            )}>
                <div className={cn(
                    "absolute inset-0 rounded-full bg-gradient-to-br shadow-lg",
                    colorClasses
                )} />
                <div className="absolute inset-0 flex items-center justify-center text-primary-foreground font-bold">
                    {label}
                </div>
            </div>
        </button>
    );
};

const ExperimentalShowcase = () => {
    return (
        <div className="space-y-16 p-8 bg-background">
            <div>
                <h2 className="text-center mb-4 text-lg font-medium text-foreground">Orbital Toggles</h2>
                <div className="flex flex-wrap justify-center gap-8">
                    <Orbit3DToggle />
                    <Orbit3DToggle color="secondary" size="sm" />
                    <Orbit3DToggle color="accent" size="lg" defaultValue={true} />
                    <Orbit3DToggle disabled />
                </div>
            </div>

            <div>
                <h2 className="text-center mb-4 text-lg font-medium text-foreground">Wave Sliders</h2>
                <div className="flex flex-wrap justify-center gap-8">
                    <WaveSlider />
                    <WaveSlider color="secondary" showValue={false} />
                    <WaveSlider color="accent" defaultValue={75} />
                    <WaveSlider disabled defaultValue={25} />
                </div>
            </div>

            <div>
                <h2 className="text-center mb-4 text-lg font-medium text-foreground">Pulse Buttons</h2>
                <div className="flex flex-wrap justify-center gap-8">
                    <PulseButton />
                    <PulseButton color="secondary" size="sm" label="CLICK" />
                    <PulseButton color="accent" size="lg" label="PRESS" />
                    <PulseButton disabled label="DISABLED" />
                </div>
            </div>
        </div>
    );
};

export default ExperimentalShowcase;
