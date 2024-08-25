import React from 'react';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

// This function gets the test pages
function getTestPages() {
    const testsDir = path.join(process.cwd(), 'app', 'tests');
    const entries = fs.readdirSync(testsDir, { withFileTypes: true });

    return entries
        .filter(entry => entry.isDirectory() && fs.existsSync(path.join(testsDir, entry.name, 'page.tsx')))
        .map(entry => ({
            name: entry.name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            description: `Test page for ${entry.name}`,
            href: `/tests/${entry.name}`
        }));
}

export default function Tester() {
    const testPages = getTestPages();

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Test Pages</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {testPages.map((page, index) => (
                    <Link href={page.href} key={index} className="no-underline">
                        <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                            <CardHeader>
                                <CardTitle>{page.name}</CardTitle>
                                <CardDescription>{page.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-blue-500">Click to view</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
