'use client';

import React from 'react';
import fs from 'fs';
import path from 'path';
import NextWindowManager from "@/components/matrx/next-windows";

function getTestPages() {
    const testsDir = path.join(process.cwd(), 'app', 'tests');
    const entries = fs.readdirSync(testsDir, {withFileTypes: true});

    return entries
        .filter(entry => entry.isDirectory() && fs.existsSync(path.join(testsDir, entry.name, 'page.tsx')))
        .map((entry, index) => ({
            id: index + 1,
            title: entry.name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            content: `Test page for ${entry.name}`,
            href: `/tests/${entry.name}`,
            images: [
                `/images/${entry.name}-1.jpg`,
                `/images/${entry.name}-2.jpg`,
                `/images/${entry.name}-3.jpg`,
            ],
        }));
}

export default function TesterTwo() {
    const testPages = getTestPages();

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Test Pages</h1>
            <NextWindowManager windows={testPages} />
        </div>
    );
}