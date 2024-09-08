import React from 'react';
import fs from 'fs';
import path from 'path';
import {MatrxWobbleCard} from "@/components/matrx/wobble-card";

function getTestPages() {
    const testsDir = path.join(process.cwd(), 'app', 'tests');
    const entries = fs.readdirSync(testsDir, {withFileTypes: true});

    return entries
        .filter(entry => entry.isDirectory() && fs.existsSync(path.join(testsDir, entry.name, 'page.tsx')))
        .map(entry => ({
            title: entry.name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            description: `Test page for ${entry.name}`,
            href: `/tests/${entry.name}`,
        }));
}

export default function TesterOne() {
    const testPages = getTestPages();

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Test Pages</h1>
            <MatrxWobbleCard cards={testPages}/>
        </div>
    );
}