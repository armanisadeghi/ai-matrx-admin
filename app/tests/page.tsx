// File Location: @/tests/page.tsx

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const testPages = [
    {
        name: "CRUD Drawer",
        description: "A tester page for The CRUD Drawer Component",
        href: "/tests/crud-drawer"
    },
    // Add more test pages here as you create them
];

export default function Tester() {
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
