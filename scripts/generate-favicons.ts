// File: @/scripts/generate-favicons.ts
// Script to generate static favicon files for all routes with favicon configurations
// Run with: npx ts-node scripts/generate-favicons.ts

import { getAllRoutesWithFavicons, generateSVGFavicon } from "@/utils/favicon-utils";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "public", "favicons");

/**
 * Generates static SVG favicon files for all configured routes
 */
function generateStaticFavicons() {
    console.log("🎨 Generating static favicon files...\n");

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log(`✅ Created output directory: ${OUTPUT_DIR}\n`);
    }

    const routesWithFavicons = getAllRoutesWithFavicons();

    console.log(`Found ${routesWithFavicons.length} routes with favicon configurations:\n`);

    routesWithFavicons.forEach((route) => {
        const { label, href, favicon } = route;

        // Generate SVG content
        const svg = generateSVGFavicon(favicon);

        // Create a safe filename from the route path
        const filename = href
            .replace(/^\//, "") // Remove leading slash
            .replace(/\//g, "-") // Replace slashes with hyphens
            .replace(/[^a-zA-Z0-9-]/g, "") || "root"; // Remove special chars, use 'root' for empty

        const outputPath = path.join(OUTPUT_DIR, `${filename}.svg`);

        // Write the SVG file
        fs.writeFileSync(outputPath, svg, "utf-8");

        console.log(`✅ ${label.padEnd(20)} → ${filename}.svg (${favicon.color}, "${favicon.letter || favicon.emoji}")`);
    });

    console.log(`\n🎉 Generated ${routesWithFavicons.length} favicon files in ${OUTPUT_DIR}`);
    console.log("\n📝 Note: These are static files. The app uses dynamic SVG generation at runtime.");
    console.log("   Static files can be useful for reference, documentation, or offline use.\n");
}

// Run the script
try {
    generateStaticFavicons();
} catch (error) {
    console.error("❌ Error generating favicons:", error);
    process.exit(1);
}

