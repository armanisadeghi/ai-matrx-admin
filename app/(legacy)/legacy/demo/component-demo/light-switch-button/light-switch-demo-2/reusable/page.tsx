'use client';

import React, {useState} from 'react';
import {cn} from "@/lib/utils";

// Types
interface BaseControlProps {
    className?: string;
    disabled?: boolean;
    onChange?: (value: any) => void;
}

interface ToggleProps extends BaseControlProps {
    variant?: 'enhanced3d' | 'standard';
    defaultValue?: boolean;
    showIndicator?: boolean;
    size?: 'sm' | 'md' | 'lg';
    labels?: { on: string; off: string };
}

interface PushButtonProps extends BaseControlProps {
    label?: string;
    color?: 'primary' | 'secondary' | 'destructive' | 'success';
    size?: 'sm' | 'md' | 'lg';
}

interface SliderProps extends BaseControlProps {
    min?: number;
    max?: number;
    defaultValue?: number;
    showValue?: boolean;
    variant?: 'gradient' | 'solid';
}

const Enhanced3DToggle = (
    {
        variant = 'enhanced3d',
        defaultValue = false,
        showIndicator = true,
        size = 'md',
        labels = {on: 'ON', off: 'OFF'},
        disabled = false,
        onChange,
        className,
    }: ToggleProps) => {
    const [isOn, setIsOn] = useState(defaultValue);
    const [isHovered, setIsHovered] = useState(false);

    const handleToggle = (newState: boolean) => {
        if (disabled) return;
        setIsOn(newState);
        onChange?.(newState);
    };

    const sizeClasses = {
        sm: 'w-32 h-12',
        md: 'w-48 h-16',
        lg: 'w-56 h-20',
    }[size];

    return (
        <div className={cn(
            "relative flex items-center justify-center space-x-4",
            disabled && "opacity-50 cursor-not-allowed",
            className
        )}>
            {showIndicator && (
                <div className={cn(
                    "w-3 h-3 rounded-full transition-all duration-500",
                    isOn
                    ? "bg-success shadow-[0_0_8px_2px_hsl(var(--success)_/_0.6)]"
                    : "bg-destructive shadow-[0_0_8px_2px_hsl(var(--destructive)_/_0.6)]"
                )}/>
            )}

            <div
                className={cn(
                    "relative flex bg-muted rounded-full shadow-inner overflow-hidden",
                    sizeClasses
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className={cn(
                    "absolute inset-0 transition-opacity duration-300",
                    isHovered ? "opacity-100" : "opacity-0",
                    "bg-gradient-to-r from-transparent via-background/20 to-transparent blur-md"
                )}/>

                <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-border transform -translate-x-1/2 z-10"/>

                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleToggle(false)}
                    className={cn(
                        "relative w-1/2 h-full transition-all duration-300",
                        !isOn
                        ? "bg-primary transform active:translate-y-1"
                        : "bg-background transform -translate-y-1"
                    )}
                >
                    <div className={cn(
                        "absolute inset-0 rounded-l-full border-r border-border",
                        !isOn
                        ? "bg-gradient-to-br from-muted/90 via-muted to-muted/90 dark:from-muted-foreground/20 dark:via-muted-foreground/10 dark:to-muted-foreground/20"
                        : "bg-gradient-to-br from-background via-background/90 to-background/80"
                    )}/>
                    <span className={cn(
                        "relative z-20 font-medium",
                        !isOn ? "text-primary-foreground" : "text-muted-foreground"
                    )}>
                        {labels.off}
                    </span>
                </button>

                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleToggle(true)}
                    className={cn(
                        "relative w-1/2 h-full transition-all duration-300",
                        isOn
                        ? "bg-primary transform active:translate-y-1"
                        : "bg-background transform -translate-y-1"
                    )}
                >
                    <div className={cn(
                        "absolute inset-0 rounded-r-full border-l border-border",
                        isOn
                        ? "bg-gradient-to-br from-primary/90 via-primary to-primary/90"
                        : "bg-gradient-to-br from-background via-background/90 to-background/80"
                    )}/>
                    <span className={cn(
                        "relative z-20 font-medium",
                        isOn ? "text-primary-foreground" : "text-muted-foreground"
                    )}>
                        {labels.on}
                    </span>
                </button>
            </div>
        </div>
    );
};

const PushButton = ({
                        label = 'PUSH',
                        color = 'primary',
                        size = 'md',
                        disabled = false,
                        onChange,
                        className,
                    }: PushButtonProps) => {
    const [isPressed, setIsPressed] = useState(false);

    const sizeClasses = {
        sm: 'w-24 h-24 text-lg',
        md: 'w-32 h-32 text-xl',
        lg: 'w-40 h-40 text-2xl',
    }[size];

    const colorClasses = {
        primary: 'from-primary/90 via-primary to-primary/90',
        secondary: 'from-secondary/90 via-secondary to-secondary/90',
        destructive: 'from-destructive/90 via-destructive to-destructive/90',
        success: 'from-success/90 via-success to-success/90',
    }[color];

    return (
        <button
            type="button"
            disabled={disabled}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => {
                setIsPressed(false);
                onChange?.(true);
            }}
            onMouseLeave={() => setIsPressed(false)}
            className={cn(
                "relative rounded-full transition-all duration-150",
                sizeClasses,
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            <div
                className={cn(
                    "absolute inset-0 rounded-full shadow-lg",
                    colorClasses
                )}
                style={{transform: 'translateY(8px)'}}
            />
            <div className={cn(
                "absolute inset-0 rounded-full shadow-lg transition-transform duration-150",
                `bg-gradient-to-br ${colorClasses}`,
                isPressed ? "transform translate-y-2" : ""
            )}>
                <span className="absolute inset-0 flex items-center justify-center text-primary-foreground font-bold">
                    {label}
                </span>
            </div>
        </button>
    );
};

const Slider3D = ({
                      min = 0,
                      max = 100,
                      defaultValue = 50,
                      showValue = true,
                      variant = 'gradient',
                      disabled = false,
                      onChange,
                      className,
                  }: SliderProps) => {
    const [value, setValue] = useState(defaultValue);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseInt(e.target.value);
        setValue(newValue);
        onChange?.(newValue);
    };

    return (
        <div className={cn(
            "w-64 h-16 bg-muted rounded-full shadow-inner relative overflow-hidden",
            disabled && "opacity-50 cursor-not-allowed",
            className
        )}>
            <div
                className={cn(
                    "absolute inset-y-0 left-0 rounded-l-full transition-all duration-300",
                    variant === 'gradient'
                    ? "bg-gradient-to-r from-primary/90 to-primary"
                    : "bg-primary"
                )}
                style={{width: `${value}%`}}
            />
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
                <div
                    className="absolute inset-0 flex items-center justify-center text-foreground font-medium mix-blend-difference">
                    {value}%
                </div>
            )}
        </div>
    );
};

const ControlsShowcase = () => {
    return (
        <div className="space-y-12 p-8 bg-background">
            <div className="max-w-2xl mx-auto">
                <section className="space-y-8">
                    <h2 className="text-2xl font-semibold text-foreground">Enhanced Toggle Switches</h2>
                    <div className="space-y-6">
                        <Enhanced3DToggle/>
                        <Enhanced3DToggle
                            size="sm"
                            labels={{on: 'Multi Select', off: 'Single Select'}}
                        />
                        <Enhanced3DToggle
                            size="lg"
                            labels={{on: 'Multi Select', off: 'Single Select'}}
                            showIndicator={false}
                            defaultValue={true}
                        />
                        <Enhanced3DToggle
                            disabled
                            labels={{on: 'ENABLED', off: 'DISABLED'}}
                        />
                    </div>
                </section>

                <section className="space-y-8 mt-12">
                    <h2 className="text-2xl font-semibold text-foreground">Push Buttons</h2>
                    <div className="flex flex-wrap gap-8">
                        <PushButton/>
                        <PushButton color="destructive" label="STOP"/>
                        <PushButton color="success" size="sm" label="OK"/>
                        <PushButton color="secondary" size="lg" label="PRESS"/>
                        <PushButton disabled label="DISABLED"/>
                    </div>
                </section>

                <section className="space-y-8 mt-12">
                    <h2 className="text-2xl font-semibold text-foreground">3D Sliders</h2>
                    <div className="space-y-6">
                        <Slider3D/>
                        <Slider3D variant="solid" showValue={false}/>
                        <Slider3D defaultValue={75}/>
                        <Slider3D disabled defaultValue={25}/>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ControlsShowcase;
