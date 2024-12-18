const { getHeaders } = require('./utils/next-config/headers');
const { remotePatterns } = require('./utils/next-config/imageConfig');
const { configureWebpack } = require('./utils/next-config/webpackConfig');
const copyFiles = require('./utils/next-config/copyFiles');

/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    reactStrictMode: false,
    headers: getHeaders,
    images: {
        remotePatterns,
    },
    webpack: configureWebpack,
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

copyFiles();

module.exports = nextConfig;
