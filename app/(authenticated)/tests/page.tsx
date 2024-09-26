'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import NextWindowManager from "@/components/matrx/next-windows";
import { RootState } from '@/lib/redux/store';

function formatTitle(route: string): string {
    return route
        .split('/')
        .pop()!
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export default function TesterTwo() {
    const testRoutes = useSelector((state: RootState) => state.testRoutes);

    const testPages = testRoutes.map((route, index) => ({
        id: index + 1,
        title: formatTitle(route),
        content: `Test page for ${route.split('/').pop()}`,
        href: route,
        images: [
            `/images/${route.split('/').pop()}-1.jpg`,
            `/images/${route.split('/').pop()}-2.jpg`,
            `/images/${route.split('/').pop()}-3.jpg`,
        ],
    }));

    return (
        <NextWindowManager
            windows={testPages}
            initialLayout={{ ratio: '2/3', columns: 4 }}
            allowLayoutChange={true}
        />
    );
}
