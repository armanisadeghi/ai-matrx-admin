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
    devIndicators: false,  // disables the indicator entirely

    compiler: {
        // TODO: Restore this when done debugging — removes console.log in production but keeps error/warn
        // removeConsole: process.env.NODE_ENV === 'production' ? {
        //     exclude: ['error', 'warn'],
        // } : false,
        removeConsole: false,
    },
    
    // Moved from experimental (Next.js 15+)
    // Exclude native binaries and build artifacts that aren't needed at runtime.
    // @swc/helpers (pure JS) must NOT be excluded — it's required at runtime by
    // packages that import it as a peer. Only exclude the platform-specific native
    // binaries (@swc/core, @next/swc-*) and esbuild binaries.
    outputFileTracingExcludes: {
        '*': [
            'node_modules/@swc/core/**/*',
            'node_modules/@next/swc-*/**/*',
            'node_modules/@esbuild/**/*',
            '.git/**/*',
            '**/*.map',
        ],
    },
    
    // TEMP: disabled to measure build-time impact. React Compiler adds a per-component
    // analysis pass that scales super-linearly with the codebase. Re-enable once we've
    // baselined compile time with it off.
    reactCompiler: false,
    experimental: {
        serverActions: {
            bodySizeLimit: "10mb",
        },
        // Optimize lucide-react (the 1400+ icon barrel file) and zustand to avoid massive SSR chunks
        optimizePackageImports: ['lucide-react', 'zustand'],
    },
    // Turbopack configuration (Next.js 16 default bundler)
    turbopack: {},
    serverExternalPackages: ["@react-pdf/renderer", "canvas", "next-mdx-remote", "vscode-oniguruma", "websocket"],
    typescript: {
        ignoreBuildErrors: true,
    },
    reactStrictMode: false,
    headers: getHeaders,
    async redirects() {
        return [
            // Static redirect — runs before proxy/auth, eliminates the flash+bounce
            // that occurred when /ssr/page.tsx did redirect() server-side after auth resolved.
            {
                source: '/ssr',
                destination: '/ssr/dashboard',
                permanent: false,
            },
        ];
    },
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

        // Externalize jsdom from client bundles (used by fabric.js)
        if (!isServer) {
            config.externals = config.externals || [];
            config.externals.push({
                jsdom: 'commonjs jsdom',
            });
        }

        // Optimize webpack for production builds - MINIMAL SAFE CONFIG
        if (!dev) {
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
            
            // Ignore pptxgenjs and other Node.js dependencies
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
                jsdom: false,
                net: false,
                tls: false,
                child_process: false,
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
    env: {
        GROQ_API_KEY: process.env.GROQ_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        CARTESIA_API_KEY: process.env.CARTESIA_API_KEY,
        NEWS_API_KEY: process.env.NEWS_API_KEY,
        PICOVOICE_ACCESS_KEY: process.env.PICOVOICE_ACCESS_KEY,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID,
        SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET,
        SLACK_REDIRECT_URL: process.env.SLACK_REDIRECT_URL,
    },
};

copyFiles();
module.exports = withBundleAnalyzer(nextConfig);