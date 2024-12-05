const fs = require('fs').promises;
const path = require('path');
const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        after: true,
        serverActions: {
            bodySizeLimit: '3mb',
        },
    },
    headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "Cross-Origin-Opener-Policy",
                        value: "same-origin",
                    },
                    {
                        key: "Cross-Origin-Embedder-Policy",
                        value: "require-corp",
                    },
                ],
            },
            {
                // Add correct MIME types for WASM files
                source: "/:path*.wasm",
                headers: [
                    {
                        key: "Content-Type",
                        value: "application/wasm",
                    },
                ],
            },
            {
                // Add correct MIME types for MJS files
                source: "/:path*.mjs",
                headers: [
                    {
                        key: "Content-Type",
                        value: "text/javascript",
                    },
                ],
            },
            {
                // Add correct MIME types for ONNX files
                source: "/:path*.onnx",
                headers: [
                    {
                        key: "Content-Type",
                        value: "application/octet-stream",
                    },
                ],
            },
        ];
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'unsplash.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '**.imagedelivery.net',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '**.aceternity.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'avatars.githubusercontent.com',
                port: '',
                pathname: '/**',
            },
        ],
    },
    webpack: (config, {isServer, webpack}) => {
        // Add support for WebAssembly
        config.experiments = {
            ...config.experiments,
            asyncWebAssembly: true,
            layers: true,
        };
        config.ignoreWarnings = [
            { module: /node_modules\/onnxruntime-web/ },
        ];

        // Configure module rules
        config.module.rules.push(
            {
                test: /\.wasm$/,
                type: "asset/resource",
                generator: {
                    filename: 'static/[hash][ext]',
                }
            },
            {
                test: /\.mjs$/,
                type: "javascript/auto",
                resolve: {
                    fullySpecified: false,
                },
            },
            {
                test: /\.onnx$/,
                type: "asset/resource",
                generator: {
                    filename: 'static/[hash][ext]',
                }
            }
        );

        config.plugins.push(
            new webpack.IgnorePlugin({
                checkResource: (resource) => {
                    const excludeDirs = ['/_armani/', '/armani/', '/_dev/'];
                    return excludeDirs.some((dir) => resource.includes(dir));
                },
            })
        );

        if (isServer) {
            config.externals.push({
                canvas: 'commonjs canvas',
                'utf-8-validate': 'commonjs utf-8-validate',
                bufferutil: 'commonjs bufferutil',
            });
        }

        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                child_process: false,
                process: require.resolve('process/browser'),
                zlib: require.resolve('browserify-zlib'),
                stream: require.resolve('stream-browserify'),
                util: require.resolve('util'),
                buffer: require.resolve('buffer'),
                assert: require.resolve('assert'),
                http: require.resolve('stream-http'),
                https: require.resolve('https-browserify'),
                os: require.resolve('os-browserify/browser'),
                url: require.resolve('url/'),
            };

            // Specific alias for node:url to browser-compatible url polyfill
            config.resolve.alias['node:url'] = require.resolve('url/');
        }

        // Add ProvidePlugin to polyfill global modules like Buffer and process
        config.plugins.push(
            new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer'],
                process: 'process/browser',
            })
        );

        config.module.rules.push({
            test: /vendors\/fabric\.js$/,
            use: ['script-loader'],
        });

        if (!isServer) {
            config.externals.push({
                'tough-cookie': 'commonjs tough-cookie',
                jsdom: 'commonjs jsdom',
                canvas: 'commonjs canvas',
            });
        }

        return config;
    },
    eslint: {
        ignoreDuringBuilds: true,
        dirs: ['pages', 'components', 'lib', 'utils', 'app'],
    },
    env: {
        GROQ_API_KEY: process.env.GROQ_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        CARTESIA_API_KEY: process.env.CARTESIA_API_KEY,
        NEWS_API_KEY: process.env.NEWS_API_KEY,
        PICOVOICE_ACCESS_KEY: process.env.PICOVOICE_ACCESS_KEY,
    },
};

async function copyFiles() {
    try {
        await fs.access("public/");
    } catch {
        await fs.mkdir("public/", {recursive: true});
    }

    try {
        // First, clean up any existing VAD-related files
        const existingFiles = await fs.readdir("public/");
        for (const file of existingFiles) {
            if (file.includes('ort-') || file.includes('silero_') || file.includes('vad.')) {
                await fs.unlink(path.join("public/", file));
            }
        }

        // Copy required files
        await Promise.all([
            // Copy worklet
            fs.copyFile(
                "node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js",
                "public/vad.worklet.bundle.min.js"
            ),
            // Copy models
            fs.copyFile(
                "node_modules/@ricky0123/vad-web/dist/silero_vad_legacy.onnx",
                "public/silero_vad_legacy.onnx"
            ),
            fs.copyFile(
                "node_modules/@ricky0123/vad-web/dist/silero_vad_v5.onnx",
                "public/silero_vad_v5.onnx"
            ),
        ]);

        // Copy all WASM and MJS files
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

        console.log('All VAD files copied successfully');
    } catch (error) {
        console.error('Error copying VAD files:', error);
    }
}

copyFiles();

module.exports = nextConfig;
