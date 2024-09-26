'use client';

import React, { useState, useRef, useEffect } from 'react';
import {motion, MotionValue, useAnimation, useMotionValue, useTransform} from 'framer-motion';
import { cn } from "@/lib/utils";

const SliderDock = ({
                        items,
                        className,
                        initialIndex = 0,
                    }: {
    items: { title: string; icon: React.ReactNode; href: string }[];
    className?: string;
    initialIndex?: number;
}) => {
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const containerRef = useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(0);
    const controls = useAnimation();

    const itemWidth = 80; // Keep original size
    const visibleItems = 5;
    const containerWidth = itemWidth * visibleItems;

    useEffect(() => {
        controls.start({ x: -activeIndex * itemWidth + containerWidth / 2 - itemWidth / 2 });
    }, [activeIndex, controls]);

    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const relativeX = event.clientX - rect.left;
            mouseX.set(relativeX);

            const edgeThreshold = itemWidth;
            if (relativeX < edgeThreshold) {
                const speed = (edgeThreshold - relativeX) / edgeThreshold;
                setActiveIndex(prev => Math.max(0, prev - speed / 10));
            } else if (relativeX > containerWidth - edgeThreshold) {
                const speed = (relativeX - (containerWidth - edgeThreshold)) / edgeThreshold;
                setActiveIndex(prev => Math.min(items.length - 1, prev + speed / 10));
            }
        }
    };

    return (
        <div
            ref={containerRef}
            className={cn("relative overflow-hidden", className)}
            style={{ width: `${containerWidth}px`, height: `${itemWidth + 40}px` }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => mouseX.set(containerWidth / 2)}
        >
            <motion.div
                className="flex absolute left-0 top-0 h-full items-end"
                animate={controls}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ paddingLeft: containerWidth / 2 - itemWidth / 2, paddingRight: containerWidth / 2 - itemWidth / 2 }}
            >
                {items.map((item, index) => (
                    <IconContainer
                        key={item.title}
                        {...item}
                        index={index}
                        activeIndex={activeIndex}
                        itemWidth={itemWidth}
                        mouseX={mouseX}
                        containerWidth={containerWidth}
                    />
                ))}
            </motion.div>
        </div>
    );
};

const IconContainer = ({
                           title,
                           icon,
                           href,
                           index,
                           activeIndex,
                           itemWidth,
                           mouseX,
                           containerWidth,
                       }: {
    title: string;
    icon: React.ReactNode;
    href: string;
    index: number;
    activeIndex: number;
    itemWidth: number;
    mouseX: MotionValue<number>;
    containerWidth: number;
}) => {
    const ref = useRef<HTMLDivElement>(null);

    const distance = useTransform(mouseX, (val) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
        return val - (bounds.x + bounds.width / 2);
    });

    const widthSync = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
    const heightSync = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
    const ySync = useTransform(distance, [-150, 0, 150], [0, -40, 0]);

    const [width, height, y] = [
        useMotionValue(40),
        useMotionValue(40),
        useMotionValue(0)
    ];

    const [hovered, setHovered] = useState(false);

    useEffect(() => {
        const unsubscribeWidth = widthSync.onChange(v => width.set(v));
        const unsubscribeHeight = heightSync.onChange(v => height.set(v));
        const unsubscribeY = ySync.onChange(v => y.set(v));
        return () => {
            unsubscribeWidth();
            unsubscribeHeight();
            unsubscribeY();
        };
    }, [widthSync, heightSync, ySync, width, height, y]);

    return (
        <motion.div
            ref={ref}
            style={{ width, height, y }}
            className="flex items-center justify-center mx-2"
        >
            <motion.a
                href={href}
                className="flex items-center justify-center w-full h-full"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                <motion.div
                    className="rounded-full bg-gray-200 dark:bg-neutral-800 flex items-center justify-center relative"
                    style={{ width: '100%', height: '100%' }}
                >
                    {icon}
                    {hovered && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap"
                        >
                            {title}
                        </motion.div>
                    )}
                </motion.div>
            </motion.a>
        </motion.div>
    );
};

export default SliderDock;
