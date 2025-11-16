import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Icon } from '@iconify/react';

const FreeFormSelection = ({ canvas }) => {
    const [isDrawing, setIsDrawing] = useState(false);
    const [path, setPath] = useState(null);

    const startDrawing = (options) => {
        setIsDrawing(true);
        const newPath = new window.fabric.Path(`M ${options.e.offsetX} ${options.e.offsetY}`, {
            strokeWidth: 2,
            stroke: 'red',
            fill: 'rgba(255,0,0,0.1)',
            selectable: false,
        });
        canvas.add(newPath);
        setPath(newPath);
    };

    const draw = (options) => {
        if (!isDrawing) return;
        path.path.push(['L', options.e.offsetX, options.e.offsetY]);
        canvas.renderAll();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        path.set({ selectable: true });
        canvas.renderAll();
    };

    const enableFreeFormSelection = () => {
        canvas.on('mouse:down', startDrawing);
        canvas.on('mouse:move', draw);
        canvas.on('mouse:up', stopDrawing);
    };

    const disableFreeFormSelection = () => {
        canvas.off('mouse:down', startDrawing);
        canvas.off('mouse:move', draw);
        canvas.off('mouse:up', stopDrawing);
    };

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 bg-blue-500 text-white rounded"
            onClick={enableFreeFormSelection}
        >
            <Icon icon="mdi:lasso" className="w-6 h-6" />
            <span className="ml-2">Free-form Selection</span>
        </motion.button>
    );
};

export default FreeFormSelection;
