// utils/printLink.ts

import path from 'path';

export function printLink(inputPath: string): string {
    const domainSuffixes = ['.com', '.org', '.net', '.io', '.us', '.gov'];
    if (typeof inputPath !== 'string') {
        throw new Error("The provided path must be a string.");
    }

    const lowerPath = inputPath.toLowerCase();
    let outputPath = inputPath;

    if (domainSuffixes.some(suffix => lowerPath.includes(suffix))) {
        console.log(outputPath);
        return outputPath;
    }

    try {
        const parsedUrl = new URL(inputPath);
        if (parsedUrl.protocol && parsedUrl.hostname) {
            console.log(outputPath);
            return outputPath;
        }
    } catch (e) {
    }

    if (!path.isAbsolute(inputPath)) {
        outputPath = path.resolve(inputPath);
    }

    const urlCompatiblePath = outputPath.replace(/\\/g, "/");
    const linkPath = `file:///${urlCompatiblePath}`;

    console.log(linkPath);
    return outputPath;
}
