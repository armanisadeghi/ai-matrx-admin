import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    // Use __dirname to get the current directory of this file
    const currentDir = __dirname;
    // Navigate up to the root of the project
    const projectRoot = path.resolve(currentDir, '..', '..', '..');
    const testsDir = path.join(projectRoot, 'app', 'tests');

    console.log('Attempting to read directory:', testsDir); // Debug log

    try {
        const entries = fs.readdirSync(testsDir, { withFileTypes: true });

        console.log('Entries found:', entries.length); // Debug log

        const testPages = entries
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

        console.log('Test pages found:', testPages.length); // Debug log

        return NextResponse.json(testPages);
    } catch (error) {
        console.error('Error reading test pages:', error);
        return NextResponse.json({ error: 'Unable to read test pages', details: error.message }, { status: 500 });
    }
}
