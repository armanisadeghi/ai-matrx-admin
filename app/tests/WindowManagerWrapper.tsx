'use client'

import React, { useState } from 'react';
import NextWindowManager from "@/components/matrx/next-windows";
import { useDispatch } from 'react-redux';
import { setIsInWindow, setLayoutStyle } from "@/lib/redux/slices/layoutSlice";
import TestPageButton from './TestPageButton'; // Adjust the import path as needed

interface WindowManagerWrapperProps {
    testPages: any[];
}

export default function WindowManagerWrapper({ testPages }: WindowManagerWrapperProps) {
    const [openWindows, setOpenWindows] = useState([]);
    const dispatch = useDispatch();

    const handleOpenWindow = (window) => {
        dispatch(setIsInWindow(true));
        dispatch(setLayoutStyle('window'));
        setOpenWindows(prevWindows => [...prevWindows, window]);
    };

    return (
        <>
            <div className="grid grid-cols-3 gap-4 mb-8">
                {testPages.map(page => (
                    <TestPageButton key={page.id} page={page} onOpenWindow={handleOpenWindow} />
                ))}
            </div>
            <NextWindowManager initialWindows={openWindows} onOpenWindow={handleOpenWindow} />
        </>
    );
}