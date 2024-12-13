// utils/imageConfig.js
exports.remotePatterns = [
    {
        protocol: 'https',
        hostname: '**',
    },
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
    {
        protocol: 'https',
        hostname: '**.bbc.co.uk',
    },
    {
        protocol: 'https',
        hostname: 'ichef.bbci.co.uk',
    },
    {
        protocol: 'https',
        hostname: 'static.foxnews.com',
    },
    {
        protocol: 'https',
        hostname: 'imageio.forbes.com',
    },
    {
        protocol: 'https',
        hostname: 'image.cnbcfm.com',
    },
    {
        protocol: 'https',
        hostname: 'www.washingtonpost.com',
    },
    {
        protocol: 'https',
        hostname: 'img.global.news.samsung.com',
    },
    {
        protocol: 'https',
        hostname: 'media.cnn.com',
    },
    {
        protocol: 'https',
        hostname: 'dims.apnews.com',
    },
    {
        protocol: 'https',
        hostname: 'cdn.vox-cdn.com',
    },
    {
        protocol: 'https',
        hostname: 'images.axios.com',
    },
    {
        protocol: 'https',
        hostname: 'regmedia.co.uk',
    },
    {
        protocol: 'https',
        hostname: 'pyxis.nymag.com',
    },
    {
        protocol: 'https',
        hostname: 'media.formula1.com',
    },
    {
        protocol: 'https',
        hostname: 'cdn.mos.cms.futurecdn.net',
    },
    {
        protocol: 'https',
        hostname: 'static.toiimg.com',
    },
    // Catch-all pattern for s3 and similar domains
    {
        protocol: 'https',
        hostname: '**.s3.amazonaws.com',
    },
];
