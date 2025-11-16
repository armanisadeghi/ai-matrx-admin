import React from 'react';
import { motion } from 'motion/react';
import { Icon } from '@iconify/react';

const CutPasteTool = ({ canvas }) => {
    const cutSelection = () => {
        const activeObject = canvas.getActiveObject();
        if (!activeObject) return;

        canvas.remove(activeObject);
        canvas.discardActiveObject();
        canvas.renderAll();
    };

    const copySelection = () => {
        const activeObject = canvas.getActiveObject();
        if (!activeObject) return;

        activeObject.clone((clonedObj) => {
            canvas.discardActiveObject();
            clonedObj.set({
                left: clonedObj.left + 10,
                top: clonedObj.top + 10,
                evented: true,
            });
            canvas.add(clonedObj);
            canvas.setActiveObject(clonedObj);
            canvas.renderAll();
        });
    };

    return (
        <div className="flex space-x-2">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 bg-red-500 text-white rounded"
                onClick={cutSelection}
            >
                <Icon icon="mdi:content-cut" className="w-6 h-6" />
                <span className="ml-2">Cut</span>
            </motion.button>
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 bg-green-500 text-white rounded"
                onClick={copySelection}
            >
                <Icon icon="mdi:content-copy" className="w-6 h-6" />
                <span className="ml-2">Copy</span>
            </motion.button>
        </div>
    );
};

export default CutPasteTool;
