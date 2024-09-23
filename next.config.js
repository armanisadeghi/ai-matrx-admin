/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
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
        ],
    },
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
        // Add plugin to ignore specific directories
        config.plugins.push(
            new webpack.IgnorePlugin({
                checkResource: (resource) => {
                    const excludeDirs = ['/armani/', '/_dev/'];
                    return excludeDirs.some((dir) => resource.includes(dir));
                },
            })
        );

        // Handle canvas and other commonjs externals
        config.externals.push({
            canvas: 'commonjs canvas',
            'utf-8-validate': 'commonjs utf-8-validate',
            bufferutil: 'commonjs bufferutil',
        });

        // Add fallback for browser-incompatible Node.js modules
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
        }

        // Add ProvidePlugin to polyfill global modules like Buffer and process
        config.plugins.push(
            new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer'],
                process: 'process/browser',
            })
        );

        // Add rule for custom Fabric.js file
        config.module.rules.push({
            test: /vendors\/fabric\.js$/,
            use: ['script-loader'],
        });

        return config;
    },
};

module.exports = nextConfig;
