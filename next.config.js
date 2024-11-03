const fs = require('fs').promises;
const path = require('path');
const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
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
    },
    experimental: {
        serverActions: {
            bodySizeLimit: '3mb',
        },
    },
};

async function copyFiles() {
    try {
        await fs.access("public/");
    } catch {
        await fs.mkdir("public/", {recursive: true});
    }

    const wasmFiles = (
        await fs.readdir("node_modules/onnxruntime-web/dist/")
    ).filter((file) => path.extname(file) === ".wasm");

    await Promise.all([
        fs.copyFile(
            "node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js",
            "public/vad.worklet.bundle.min.js"
        ),
        fs.copyFile(
            "node_modules/@ricky0123/vad-web/dist/silero_vad.onnx",
            "public/silero_vad.onnx"
        ),
        ...wasmFiles.map((file) =>
            fs.copyFile(
                `node_modules/onnxruntime-web/dist/${file}`,
                `public/${file}`
            )
        ),
    ]);
}

// Run the copyFiles function
copyFiles();

module.exports = nextConfig;
