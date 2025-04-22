"use client";

import React, { useState, useEffect } from "react";
import styles from "./animations.module.css";

interface LongProcessProps {
    message?: string;
    className?: string;
}

const LongProcess: React.FC<LongProcessProps> = ({ message = "Processing...", className = "" }) => {
    return (
        <div className={`flex items-center ${className}`}>
            <div className="flex items-center">
                <div className={`w-1 h-2.5 mx-0.5 bg-primary dark:bg-primary-dark rounded-sm ${styles.bounceBar1}`}></div>
                <div className={`w-1 h-2.5 mx-0.5 bg-primary dark:bg-primary-dark rounded-sm ${styles.bounceBar2}`}></div>
                <div className={`w-1 h-2.5 mx-0.5 bg-primary dark:bg-primary-dark rounded-sm ${styles.bounceBar3}`}></div>
                <div className={`w-1 h-2.5 mx-0.5 bg-primary dark:bg-primary-dark rounded-sm ${styles.bounceBar4}`}></div>
            </div>
            <div className="ml-3 relative h-5 overflow-hidden">
                <span className={`absolute text-sm text-gray-700 dark:text-gray-300 transition-opacity duration-500`}>{message}</span>
            </div>
        </div>
    );
};

export default LongProcess;
