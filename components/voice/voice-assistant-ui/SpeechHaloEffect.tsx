'use client';

import { motion } from "motion/react";
import React from "react";

function SpeechHaloEffect() {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <motion.div
                className="absolute inset-0"
                initial="hidden"
                animate="visible"
            >
                {[1, 2, 3].map((index) => (
                    <motion.div
                        key={index}
                        className="absolute inset-0 bg-primary/5 rounded-full"
                        animate={{
                            scale: [1, 1.5, 2],
                            opacity: [0.5, 0.2, 0],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: index * 0.4,
                            ease: "easeOut",
                        }}
                    />
                ))}
            </motion.div>
        </div>
    );
}


export default SpeechHaloEffect;

