// scripts/generate-manifest.js
const path = require('path');
const fs = require('fs').promises;

async function findProjectRoot(startPath) {
    let currentPath = startPath;
    const root = path.parse(currentPath).root;

    while (currentPath !== root) {
        try {
            const packagePath = path.join(currentPath, 'package.json');
            await fs.access(packagePath);
            return currentPath;
        } catch {
            currentPath = path.dirname(currentPath);
        }
    }

    throw new Error('Could not find project root');
}

async function generateManifest() {
    try {
        console.log('🚀 Starting manifest generation...');

        const projectRoot = await findProjectRoot(__dirname);
        const testsPath = path.join(projectRoot, 'app', '(authenticated)', 'tests');

        const entries = await fs.readdir(testsPath, { withFileTypes: true });
        const directories = entries
            .filter(dirent => dirent.isDirectory())
            .map(dirent => ({
                path: `/tests/${dirent.name}`,
                name: dirent.name
            }));

        const publicDir = path.join(projectRoot, 'public');
        await fs.mkdir(publicDir, { recursive: true });

        const manifestPath = path.join(publicDir, 'test-directories.json');
        await fs.writeFile(
            manifestPath,
            JSON.stringify(directories, null, 2)
        );

        console.log(`✅ Generated manifest with ${directories.length} directories`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error generating manifest:', error);
        process.exit(1);
    }
}

generateManifest();
