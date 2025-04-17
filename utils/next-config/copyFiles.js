const fs = require('fs').promises;
const path = require('path');

async function copyFiles() {
    try {
        await fs.access("public/");
    } catch {
        await fs.mkdir("public/", { recursive: true });
    }

    try {
        // First, clean up any existing VAD-related files
        const existingFiles = await fs.readdir("public/");
        for (const file of existingFiles) {
            if (file.includes('ort-') || file.includes('silero_') || file.includes('vad.')) {
                await fs.unlink(path.join("public/", file));
            }
        }

        // Comment out the copying of VAD files since we're loading from CDN
        /*
        await Promise.all([
            fs.copyFile(
                "node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js",
                "public/vad.worklet.bundle.min.js"
            ),
            fs.copyFile(
                "node_modules/@ricky0123/vad-web/dist/silero_vad_legacy.onnx",
                "public/silero_vad_legacy.onnx"
            ),
            fs.copyFile(
                "node_modules/@ricky0123/vad-web/dist/silero_vad_v5.onnx",
                "public/silero_vad_v5.onnx"
            ),
        ]);
        */

        // Comment out the copying of ONNX Runtime WASM files since we're loading from CDN
        /*
        const wasmFiles = (await fs.readdir("node_modules/onnxruntime-web/dist/"))
            .filter(file => file.endsWith('.wasm') || file.endsWith('.mjs'));

        await Promise.all(
            wasmFiles.map(file =>
                fs.copyFile(
                    `node_modules/onnxruntime-web/dist/${file}`,
                    `public/${file}`
                )
            )
        );
        */

    } catch (error) {
        console.error('Error in copyFiles:', error);
    }
}

module.exports = copyFiles;