'use client';

import React, { useState, useEffect } from 'react';
import NextWindowManager from "@/components/matrx/next-windows";
import { useDispatch } from 'react-redux';
import { setIsInWindow, setLayoutStyle } from "@/lib/redux/slices/layoutSlice";

const placeholderImages = [
    "https://via.placeholder.com/150",
    "https://via.placeholder.com/150",
    "https://via.placeholder.com/150"
];

function getTestPages() {
    return [
        {
            id: 1,
            title: "Test One",
            content: "Test page for Test One",
            href: "/tests/test-one",
            images: placeholderImages,
        },
        {
            id: 2,
            title: "Test Two",
            content: "Test page for Test Two",
            href: "/tests/test-two",
            images: placeholderImages,
        },
        {
            id: 3,
            title: "Test Three",
            content: "Test page for Test Three",
            href: "/tests/test-three",
            images: placeholderImages,
        },
    ];
}

export default function TesterTwo() {
    const [openWindows, setOpenWindows] = useState([]);
    const [testPages, setTestPages] = useState([]);
    const dispatch = useDispatch();

    useEffect(() => {
        // Simulate async data fetching
        setTestPages(getTestPages());
    }, []);

    const handleOpenWindow = (window) => {
        dispatch(setIsInWindow(true));
        dispatch(setLayoutStyle('window'));
        setOpenWindows(prevWindows => [...prevWindows, window]);
    };

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Test Pages</h1>
            <div className="grid grid-cols-3 gap-4 mb-8">
                {testPages.map(page => (
                    <button
                        key={page.id}
                        onClick={() => handleOpenWindow(page)}
                        className="p-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                    >
                        {page.title}
                    </button>
                ))}
            </div>
            <NextWindowManager
                initialWindows={openWindows}
                onOpenWindow={handleOpenWindow}
                initialLayout={{ ratio: '2/3', columns: 4 }}
                allowLayoutChange={true}
            />
        </div>
    );
}