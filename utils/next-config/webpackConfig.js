const webpack = require('webpack');

exports.configureWebpack = (config, { isServer }) => {
    // Add support for WebAssembly

    // if (dev) {
    //     config.cache = {
    //         type: 'filesystem',
    //         buildDependencies: {
    //             config: [__filename],
    //         },
    //     };
    // };

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

        config.resolve.alias['node:url'] = require.resolve('url/');

        config.externals.push({
            'tough-cookie': 'commonjs tough-cookie',
            jsdom: 'commonjs jsdom',
            canvas: 'commonjs canvas',
        });
    }

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

    return config;
};
