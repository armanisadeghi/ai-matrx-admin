'use client';

import React, {useState, useEffect, useRef} from 'react';
import {motion, AnimatePresence, useMotionValue, useTransform} from 'framer-motion';
import {X, Minus, Maximize2, Minimize2, Command, Settings} from 'lucide-react';
import {useRouter, usePathname} from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import CommandPalette from "@/components/matrx/next-windows/CommandPallet";

const DEFAULT_IMAGE = '/images/dashboard.jpg';

const LAYOUT_OPTIONS = [
    {ratio: '2/4', columns: 4},
    {ratio: '2/3', columns: 4},
    {ratio: '2/2', columns: 4},
    {ratio: '3/2', columns: 3},
    {ratio: '4/2', columns: 3},
    {ratio: '6/2', columns: 2},
    {ratio: '8/2', columns: 2},
];

const LayoutControl = ({currentLayout, onLayoutChange}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="absolute top-2 right-2 z-50">
            <motion.button
                className="bg-primary text-primary-foreground p-2 rounded-full shadow-lg"
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{scale: 1.1}}
                whileTap={{scale: 0.9}}
            >
                <Settings size={16}/>
            </motion.button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{opacity: 0, y: -10}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: -10}}
                        className="absolute top-10 right-0 bg-popover text-popover-foreground p-2 rounded-lg shadow-lg"
                    >
                        {LAYOUT_OPTIONS.map((option, index) => (
                            <button
                                key={index}
                                className={`block w-full text-left p-2 rounded hover:bg-primary hover:text-primary-foreground ${
                                    currentLayout.ratio === option.ratio ? 'bg-primary text-primary-foreground' : ''
                                }`}
                                onClick={() => {
                                    onLayoutChange(option);
                                    setIsOpen(false);
                                }}
                            >
                                {option.ratio} ({option.columns} columns)
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


const Window = (
    {
        id,
        title,
        content,
        images,
        onClose,
        onMinimize,
        onMaximize,
        onClick,
        isFullScreen,
        isMinimized,
        href,
        windowSize
    }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [validImages, setValidImages] = useState([]);
    const scale = useMotionValue(1);
    const boxShadow = useTransform(
        scale,
        [1, 1.05],
        ['0px 10px 30px hsl(var(--muted) / 0.2)', '0px 30px 60px hsl(var(--muted) / 0.4)']
    );

    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const checkImages = async () => {
            const checkedImages = await Promise.all(
                images.map(async (src) => {
                    try {
                        const res = await fetch(src, {method: 'HEAD'});
                        return res.ok ? src : null;
                    } catch {
                        return null;
                    }
                })
            );
            setValidImages(checkedImages.filter(Boolean));
        };

        checkImages();
    }, [images]);

    useEffect(() => {
        if (!isFullScreen && validImages.length > 0) {
            const interval = setInterval(() => {
                setCurrentImageIndex((prevIndex) => (prevIndex + 1) % validImages.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [isFullScreen, validImages]);

    const handleClick = () => {
        if (!isFullScreen) {
            onClick(id);
        } else {
            router.push(href);
        }
    };

    const currentImage = validImages[currentImageIndex] || DEFAULT_IMAGE;

    return (
        <motion.div
            className={`bg-card/80 backdrop-blur-md rounded-lg overflow-hidden ${
                isFullScreen ? 'fixed inset-0 z-40' : ''
            } ${isMinimized ? 'h-8' : ''} border-2 border-primary cursor-pointer`}
            style={{
                boxShadow,
                scale,
                width: isFullScreen ? '100%' : windowSize.width,
                height: isMinimized ? 32 : (isFullScreen ? '100%' : windowSize.height),
            }}
            onClick={handleClick}
            initial={isFullScreen ? {scale: 0.5, opacity: 0, rotateY: 180} : {scale: 1, opacity: 1, rotateY: 0}}
            animate={isFullScreen ? {scale: 1, opacity: 1, rotateY: 0} : {scale: 1, opacity: 1, rotateY: 0}}
            exit={{scale: 0.5, opacity: 0}}
            transition={{type: 'spring', stiffness: 100, damping: 20, duration: 0.5}}
            drag={!isFullScreen && !isMinimized}
            dragConstraints={{left: 0, top: 0, right: 0, bottom: 0}}
            dragElastic={0.1}
            whileHover={isFullScreen || isMinimized ? {} : {scale: 1.05}}
            whileTap={isFullScreen || isMinimized ? {} : {scale: 0.95}}
            layout
        >
            <motion.div
                className={`bg-primary text-primary-foreground p-1 flex justify-between items-center ${isFullScreen || isMinimized ? '' : 'cursor-move'}`}
                onPanEnd={(e, info) => {
                    if (!isFullScreen && !isMinimized && Math.abs(info.offset.y) > 100) {
                        onMinimize(id);
                    }
                }}
            >
                <h3 className="text-xs font-semibold truncate max-w-[calc(100%-60px)]">{title}</h3>
                <div className="flex space-x-1">
                    <button onClick={(e) => {
                        e.stopPropagation();
                        onMinimize(id);
                    }} className="text-primary-foreground"><Minus size={12}/></button>
                    <button onClick={(e) => {
                        e.stopPropagation();
                        onMaximize(id);
                    }} className="text-primary-foreground"><Maximize2 size={12}/></button>
                    <button onClick={(e) => {
                        e.stopPropagation();
                        onClose(id);
                    }} className="text-primary-foreground"><X size={12}/></button>
                </div>
            </motion.div>
            {!isMinimized && (
                <div className={`${isFullScreen ? 'h-[calc(100%-24px)]' : 'h-[calc(100%-24px)]'} overflow-auto`}>
                    {isFullScreen ? (
                        <iframe src={href} className="w-full h-full border-none"/>
                    ) : (
                        <div className="relative h-full">
                            <Image
                                src={currentImage}
                                alt={title}
                                layout="fill"
                                objectFit="cover"
                                quality={100}
                            />
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};

interface NextWindowManagerProps {
    windows?: any[]; // Keep for backward compatibility
    initialWindows?: any[]; // New prop
    initialLayout?: { ratio: string; columns: number };
    allowLayoutChange?: boolean;
    onOpenWindow?: (window: any) => void; // New prop
}


const NextWindowManager: React.FC<NextWindowManagerProps> = (
    {
        windows: propWindows,
        initialWindows = [],
        initialLayout = {ratio: '2/3', columns: 4},
        allowLayoutChange = true,
        onOpenWindow
    }) => {
    const [windows, setWindows] = useState(propWindows || initialWindows);
    const [fullScreenWindow, setFullScreenWindow] = useState(null);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [backgroundPosition, setBackgroundPosition] = useState({x: 0, y: 0});
    const containerRef = useRef(null);
    const [windowSize, setWindowSize] = useState({width: 0, height: 0});
    const [currentLayout, setCurrentLayout] = useState(initialLayout);

    const router = useRouter();

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                const [widthRatio, heightRatio] = currentLayout.ratio.split('/').map(Number);
                let columns = currentLayout.columns;

                // Responsive adjustments
                if (containerWidth < 1200) columns = Math.min(columns, 3);
                if (containerWidth < 1000) columns = Math.min(columns, 2);
                if (containerWidth < 800) columns = 1;

                const maxWindowWidth = Math.min(400, (containerWidth - (columns + 5) * 16) / columns);
                const windowHeight = (maxWindowWidth * heightRatio) / widthRatio;
                setWindowSize({width: maxWindowWidth, height: windowHeight});
            }
        };

        handleResize();
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [currentLayout]);

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'k' && e.metaKey) {
                e.preventDefault();
                setIsCommandPaletteOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    const closeWindow = (id) => {
        setWindows(windows.filter(window => window.id !== id));
        if (fullScreenWindow === id) setFullScreenWindow(null);
    };

    const minimizeWindow = (id) => {
        setWindows(windows.map(window =>
            window.id === id ? {...window, minimized: !window.minimized} : window
        ));
        if (fullScreenWindow === id) setFullScreenWindow(null);
    };

    const maximizeWindow = (id) => {
        setFullScreenWindow(fullScreenWindow === id ? null : id);
    };

    const handleWindowClick = (id) => {
        setFullScreenWindow(id);
    };

    const handleCommand = (command) => {
        console.log('Executing command:', command);
        if (onOpenWindow && command.type === 'open-window') {
            onOpenWindow(command.window);
        }
        // Implement other command handling logic here
    };

    const handleLayoutChange = (newLayout) => {
        setCurrentLayout(newLayout);
    };

    return (
        <motion.div
            ref={containerRef}
            className="relative w-full h-screen overflow-auto bg-background p-8"
            onMouseMove={(e) => {
                setBackgroundPosition({x: e.clientX / 100, y: e.clientY / 100});
            }}
            animate={{
                backgroundPosition: `${backgroundPosition.x}px ${backgroundPosition.y}px`,
            }}
            transition={{type: 'spring', stiffness: 50, damping: 20}}
        >
            {allowLayoutChange && (
                <LayoutControl
                    currentLayout={currentLayout}
                    onLayoutChange={handleLayoutChange}
                />
            )}
            <CommandPalette
                isOpen={isCommandPaletteOpen}
                onClose={() => setIsCommandPaletteOpen(false)}
                onCommand={handleCommand}
            />
            <div className="flex flex-wrap gap-4">
                <AnimatePresence>
                    {windows.map((window) => (
                        <Window
                            key={window.id}
                            {...window}
                            onClose={closeWindow}
                            onMinimize={minimizeWindow}
                            onMaximize={maximizeWindow}
                            onClick={handleWindowClick}
                            isFullScreen={fullScreenWindow === window.id}
                            windowSize={windowSize}
                        />
                    ))}
                </AnimatePresence>
            </div>
            {fullScreenWindow && (
                <motion.div
                    className="fixed bottom-4 right-4 bg-popover text-popover-foreground p-2 rounded-full shadow-lg cursor-pointer z-50"
                    onClick={() => setFullScreenWindow(null)}
                    initial={{scale: 0, opacity: 0}}
                    animate={{scale: 1, opacity: 1}}
                    exit={{scale: 0, opacity: 0}}
                    whileHover={{scale: 1.1}}
                    whileTap={{scale: 0.9}}
                >
                    <Minimize2 size={24}/>
                </motion.div>
            )}
            <motion.button
                className="fixed bottom-4 left-4 bg-popover text-popover-foreground p-2 rounded-full shadow-lg cursor-pointer z-50"
                onClick={() => setIsCommandPaletteOpen(prev => !prev)}
                whileHover={{scale: 1.1}}
                whileTap={{scale: 0.9}}
            >
                <Command size={24}/>
            </motion.button>
        </motion.div>
    );
};

export default NextWindowManager;
