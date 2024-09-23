import React from 'react';
import { motion } from 'framer-motion';

const OpacityTool = ({ canvas }) => {
    const handleOpacityChange = (event) => {
        const opacity = parseFloat(event.target.value);
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            activeObject.set('opacity', opacity);
            canvas.renderAll();
        }
    };

    return (
        <div className="flex items-center space-x-2">
            <label htmlFor="opacity" className="text-sm font-medium">Opacity:</label>
            <motion.input
                whileHover={{ scale: 1.05 }}
                type="range"
                id="opacity"
                min="0"
                max="1"
                step="0.1"
                defaultValue="1"
                onChange={handleOpacityChange}
                className="w-32"
            />
        </div>
    );
};

export default OpacityTool;
