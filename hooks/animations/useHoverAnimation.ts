import { useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

const useHoverAnimation = () => {
    const controls = useAnimation();
    return {
        onMouseEnter: () => controls.start({ scale: 1.05 }),
        onMouseLeave: () => controls.start({ scale: 1 }),
        animation: controls,
    };
};

// // In component
// const hoverAnimation = useHoverAnimation();
// <motion.div {...hoverAnimation}>Content</motion.div>;
