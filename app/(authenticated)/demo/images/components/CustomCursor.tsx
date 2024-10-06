import React, { useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function CustomCursor({ isEnabled = true }) {
    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);
    const springConfig = { damping: 25, stiffness: 700 };
    const cursorXSpring = useSpring(cursorX, springConfig);
    const cursorYSpring = useSpring(cursorY, springConfig);

    const [visible, setVisible] = useState(false);
    const [clicked, setClicked] = useState(false);

    const onMouseMove = useCallback((event) => {
        cursorX.set(event.clientX - 16);
        cursorY.set(event.clientY - 16);
    }, [cursorX, cursorY]);

    const onMouseEnter = useCallback(() => setVisible(true), []);
    const onMouseLeave = useCallback(() => setVisible(false), []);
    const onMouseDown = useCallback(() => setClicked(true), []);
    const onMouseUp = useCallback(() => setClicked(false), []);

    useEffect(() => {
        if (isEnabled) {
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseenter', onMouseEnter);
            document.addEventListener('mouseleave', onMouseLeave);
            document.addEventListener('mousedown', onMouseDown);
            document.addEventListener('mouseup', onMouseUp);

            return () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseenter', onMouseEnter);
                document.removeEventListener('mouseleave', onMouseLeave);
                document.removeEventListener('mousedown', onMouseDown);
                document.removeEventListener('mouseup', onMouseUp);
            };
        }
    }, [isEnabled, onMouseMove, onMouseEnter, onMouseLeave, onMouseDown, onMouseUp]);

    if (!isEnabled) {
        return null;
    }

    return (
        <>
            <style jsx global>{`
                * {
                    cursor: ${isEnabled ? 'none' : 'auto'} !important;
                }
            `}</style>
            <motion.div
                className="custom-cursor"
                style={{
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    zIndex: 9999,
                    mixBlendMode: 'difference',
                    backgroundColor: 'white',
                    opacity: visible ? 1 : 0,
                    x: cursorXSpring,
                    y: cursorYSpring,
                    scale: clicked ? 0.8 : 1,
                }}
                transition={{
                    scale: {
                        type: "spring",
                        stiffness: 1000,
                        damping: 28,
                    }
                }}
            />
        </>
    );
}