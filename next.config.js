// next.config.js

const { getHeaders } = require("./utils/next-config/headers");
// const { remotePatterns } = require("./utils/next-config/imageConfig");
const { configureWebpack } = require("./utils/next-config/webpackConfig");
const copyFiles = require("./utils/next-config/copyFiles");
const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
    openAnalyzer: true,
    generateStatsFile: true,
    statsFilename: "stats.json",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Build performance optimizations
    productionBrowserSourceMaps: false,
    
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production' ? {
            exclude: ['error', 'warn'],
        } : false,
    },
    
    // Moved from experimental (Next.js 15+)
    outputFileTracingExcludes: {
        '*': [
            'node_modules/@swc/**/*',
            'node_modules/@esbuild/**/*',
            '.git/**/*',
            '**/*.md',
            '**/*.map',
        ],
    },
    
    experimental: {
        serverActions: {
            bodySizeLimit: "10mb",
        },
        optimizePackageImports: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-accordion',
            '@radix-ui/react-scroll-area',
            'lucide-react',
            '@tabler/icons-react',
            'lodash',
            'date-fns',
            'recharts',
            'framer-motion',
        ],
    },
    // Disable build caching for Vercel deployments
    // generateBuildId: async () => {
    //     return `build-${Date.now()}`;
    // },
    onDemandEntries: {
        maxInactiveAge: 1,
    },
    serverExternalPackages: ["@react-pdf/renderer", "canvas", "next-mdx-remote", "vscode-oniguruma", "websocket"],
    typescript: {
        ignoreBuildErrors: true,
    },
    reactStrictMode: false,
    headers: getHeaders,
    async rewrites() {
        return [
            {
                source: '/u/:slug*',
                destination: '/apps/custom/:slug*',
            },
        ];
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**",
            },
            {
                protocol: "https",
                hostname: "api.microlink.io",
            },
        ],
    },
    webpack: (config, { isServer, dev }) => {
        // First apply your existing webpack config
        config = configureWebpack(config, { isServer });

        // Optimize webpack for production builds
        if (!dev) {
            config.cache = {
                type: 'filesystem',
                maxAge: 604800000, // 1 week
                maxMemoryGenerations: 1,
            };
            config.output.hashFunction = 'xxhash64';
        }

        // Add rule to prevent bundling of .onnx files
        config.module.rules.push({
            test: /\.onnx$/,
            type: "asset/resource",
            generator: {
                filename: "static/[hash][ext]",
            },
        });

        // Suppress THREE.WebGLProgram shader error in development mode
        if (dev) {
            const FilterWarningsPlugin = require("webpack-filter-warnings-plugin");
            config.plugins.push(
                new FilterWarningsPlugin({
                    exclude: /THREE\.WebGLProgram: Shader Error 0 - VALIDATE_STATUS false/,
                })
            );
        }

        // Handle pptxgenjs for client-side only
        if (!isServer) {
            const webpack = require('webpack');
            
            // Ignore pptxgenjs Node.js dependencies
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
                crypto: false,
                stream: false,
                buffer: false,
                'node:fs': false,
                'node:path': false,
                'node:stream': false,
            };
            
            // Replace node: protocol imports with empty module
            config.plugins.push(
                new webpack.NormalModuleReplacementPlugin(
                    /^node:/,
                    (resource) => {
                        resource.request = resource.request.replace(/^node:/, '');
                    }
                )
            );
        }

        // Disable webpack caching to ensure fresh builds
        // config.cache = false;

        return config;
    },
    eslint: {
        ignoreDuringBuilds: true,
        dirs: ["pages", "components", "lib", "utils", "app"],
    },
    env: {
        GROQ_API_KEY: process.env.GROQ_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        CARTESIA_API_KEY: process.env.CARTESIA_API_KEY,
        NEWS_API_KEY: process.env.NEWS_API_KEY,
        PICOVOICE_ACCESS_KEY: process.env.PICOVOICE_ACCESS_KEY,
        STREAM_SECRET_KEY: process.env.STREAM_SECRET_KEY,
        STREAM_API_KEY: process.env.STREAM_API_KEY,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID,
        SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET,
        SLACK_REDIRECT_URL: process.env.SLACK_REDIRECT_URL,
    },
};

// Move copyFiles after the bundle analyzer setup
const finalConfig = withBundleAnalyzer(nextConfig);
copyFiles();
module.exports = finalConfig;