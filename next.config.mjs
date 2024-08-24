/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
        config.plugins.push(
            new webpack.IgnorePlugin({
                checkResource: (resource) => {
                    const excludeDirs = ['/armani/', '/_dev/'];
                    return excludeDirs.some(dir => resource.includes(dir));
                },
            })
        );
        return config;
    },
};

export default nextConfig;
