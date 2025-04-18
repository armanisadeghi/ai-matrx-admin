// utils/headers.js

exports.getHeaders = () => [
    {
        source: "/:path*.wasm",
        headers: [
            {
                key: "Content-Type",
                value: "application/wasm",
            },
        ],
    },
    {
        source: "/:path*.mjs",
        headers: [
            {
                key: "Content-Type",
                value: "text/javascript",
            },
        ],
    },
    {
        source: "/:path*.onnx",
        headers: [
            {
                key: "Content-Type",
                value: "application/octet-stream",
            },
        ],
    },
    {
        source: "/:all*(svg|jpg|png)",
        headers: [
            {
                key: "Cache-Control",
                value: "public, max-age=31536000, immutable",
            },
        ],
    },
];


// exports.getHeaders = () => [
//     {
//         source: "/(.*)",
//         headers: [
//             {
//                 key: "Cross-Origin-Opener-Policy",
//                 value: "same-origin",
//             },
//             {
//                 key: "Cross-Origin-Embedder-Policy",
//                 value: "credentialless",
//             },
//             {
//                 key: "Cross-Origin-Resource-Policy",
//                 value: "cross-origin", // Allows Google Fonts and CDN
//             },
//         ],
//     },
//     {
//         source: "/:path*.wasm",
//         headers: [
//             {
//                 key: "Content-Type",
//                 value: "application/wasm",
//             },
//         ],
//     },
//     {
//         source: "/:path*.mjs",
//         headers: [
//             {
//                 key: "Content-Type",
//                 value: "text/javascript",
//             },
//         ],
//     },
//     {
//         source: "/:path*.onnx",
//         headers: [
//             {
//                 key: "Content-Type",
//                 value: "application/octet-stream",
//             },
//         ],
//     },
//     {
//         source: "/:all*(svg|jpg|png)",
//         headers: [
//             {
//                 key: "Cache-Control",
//                 value: "public, max-age=31536000, immutable",
//             },
//         ],
//     },
// ];
