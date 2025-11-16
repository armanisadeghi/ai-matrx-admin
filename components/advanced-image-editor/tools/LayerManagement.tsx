import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Icon } from '@iconify/react';

const LayerManagement = ({ canvas }) => {
    const [layers, setLayers] = useState([]);

    useEffect(() => {
        if (canvas) {
            updateLayers();
            canvas.on('object:added', updateLayers);
            canvas.on('object:removed', updateLayers);
            return () => {
                canvas.off('object:added', updateLayers);
                canvas.off('object:removed', updateLayers);
            };
        }
    }, [canvas]);

    const updateLayers = () => {
        if (canvas) {
            setLayers(canvas.getObjects());
        }
    };

    const moveLayerUp = (index) => {
        if (canvas && index < layers.length - 1) {
            canvas.moveTo(layers[index], index + 1);
            updateLayers();
        }
    };

    const moveLayerDown = (index) => {
        if (canvas && index > 0) {
            canvas.moveTo(layers[index], index - 1);
            updateLayers();
        }
    };

    if (!canvas) {
        return null; // Or you could return a loading indicator here
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-4 p-4 bg-white rounded shadow"
        >
            <h3 className="text-lg font-semibold mb-2">Layers</h3>
            {layers.map((layer, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-center justify-between py-2 border-b"
                >
                    <span>Layer {index + 1}</span>
                    <div className="space-x-2">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => moveLayerUp(index)}
                            className="p-1 bg-blue-500 text-white rounded"
                            disabled={index === layers.length - 1}
                        >
                            <Icon icon="mdi:arrow-up" className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => moveLayerDown(index)}
                            className="p-1 bg-blue-500 text-white rounded"
                            disabled={index === 0}
                        >
                            <Icon icon="mdi:arrow-down" className="w-4 h-4" />
                        </motion.button>
                    </div>
                </motion.div>
            ))}
        </motion.div>
    );
};

export default LayerManagement;
