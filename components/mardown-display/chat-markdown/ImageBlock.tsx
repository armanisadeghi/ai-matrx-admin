"use client";
import React, { useState, useRef } from "react";
import {
    DownloadIcon,
    ClipboardCopyIcon,
    ThumbsUpIcon,
    ThumbsDownIcon,
    CheckIcon,
    ShareIcon,
    Maximize2Icon,
    ZoomInIcon,
    ZoomOutIcon,
    XIcon,
    CopyIcon,
} from "lucide-react";

interface ImageBlockProps {
    src: string;
    alt?: string;
}

const ImageBlock: React.FC<ImageBlockProps> = ({ src, alt = "Image" }) => {
    const [feedback, setFeedback] = useState<"none" | "like" | "dislike">("none");
    const [showCopySuccess, setShowCopySuccess] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showExpandedView, setShowExpandedView] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const imageRef = useRef<HTMLImageElement>(null);

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();

        try {
            // Fetch the image first
            const response = await fetch(src);
            const blob = await response.blob();

            // Create a download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = src.split("/").pop() || "image";
            document.body.appendChild(link);
            link.click();

            // Clean up
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to download image:", err);
        }
    };

    const handleCopyUrl = (e: React.MouseEvent) => {
        e.preventDefault();
        navigator.clipboard
            .writeText(src)
            .then(() => {
                setShowCopySuccess(true);
                setTimeout(() => setShowCopySuccess(false), 2000);
            })
            .catch((err) => {
                console.error("Failed to copy URL:", err);
            });
    };

    const handleCopyImage = async (e: React.MouseEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(src);
            const blob = await response.blob();

            // Copy the image to clipboard
            if (navigator.clipboard && navigator.clipboard.write) {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        [blob.type]: blob,
                    }),
                ]);
                setShowCopySuccess(true);
                setTimeout(() => setShowCopySuccess(false), 2000);
            } else {
                console.error("Clipboard API not supported");
            }
        } catch (err) {
            console.error("Failed to copy image to clipboard:", err);
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Shared Image",
                    url: src,
                });
            } catch (err) {
                console.error("Failed to share:", err);
            }
        } else {
            setShowShareModal(true);
        }
    };

    const handleFeedback = (type: "like" | "dislike") => {
        setFeedback(type);
        // Here you could send the feedback to your backend
        console.log(`User ${type}d this image`);
    };

    const openInNewTab = (url: string) => {
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleExpand = () => {
        setShowExpandedView(true);
        setZoomLevel(1);
    };

    const handleZoomIn = () => {
        setZoomLevel((prev) => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
        setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
    };

    const handleCloseExpanded = () => {
        setShowExpandedView(false);
        setZoomLevel(1);
    };

    return (
        <div className="relative inline-block my-4 rounded-3xl group">
            <img ref={imageRef} src={src} alt={alt} className="max-w-full pt-2 h-auto rounded-3xl" />

            {/* Action buttons - visible on group hover */}
            <div className="absolute top-4 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                    onClick={handleDownload}
                    className="text-white bg-black/40 hover:bg-black/60 p-2 rounded-full transition-all duration-200"
                    title="Download"
                >
                    <DownloadIcon className="w-4 h-4" />
                </button>
                <button
                    onClick={handleCopyUrl}
                    className="text-white bg-black/40 hover:bg-black/60 p-2 rounded-full transition-all duration-200"
                    title="Copy URL"
                >
                    <ClipboardCopyIcon className="w-4 h-4" />
                </button>
                <button
                    onClick={handleCopyImage}
                    className="text-white bg-black/40 hover:bg-black/60 p-2 rounded-full transition-all duration-200"
                    title="Copy Image"
                >
                    <CopyIcon className="w-4 h-4" />
                </button>
                <button
                    onClick={handleShare}
                    className="text-white bg-black/40 hover:bg-black/60 p-2 rounded-full transition-all duration-200"
                    title="Share"
                >
                    <ShareIcon className="w-4 h-4" />
                </button>
                <button
                    onClick={handleExpand}
                    className="text-white bg-black/40 hover:bg-black/60 p-2 rounded-full transition-all duration-200"
                    title="Expand"
                >
                    <Maximize2Icon className="w-4 h-4" />
                </button>
            </div>

            {/* Feedback section - now on bottom left */}
            <div className="absolute bottom-2 left-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                    onClick={() => handleFeedback("like")}
                    className={`p-2 rounded-full transition-all duration-200 ${
                        feedback === "like" ? "bg-green-500 text-white" : "text-white bg-black/40 hover:bg-black/60"
                    }`}
                    title="Like"
                >
                    <ThumbsUpIcon className="w-4 h-4" />
                </button>
                <button
                    onClick={() => handleFeedback("dislike")}
                    className={`p-2 rounded-full transition-all duration-200 ${
                        feedback === "dislike" ? "bg-red-500 text-white" : "text-white bg-black/40 hover:bg-black/60"
                    }`}
                    title="Dislike"
                >
                    <ThumbsDownIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Share modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShareModal(false)}>
                    <div className="bg-white p-6 rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4">Share this image</h3>
                        <div className="flex flex-wrap gap-4 mb-4">
                            <button
                                onClick={() => openInNewTab(`https://twitter.com/intent/tweet?url=${encodeURIComponent(src)}`)}
                                className="bg-blue-400 text-white px-4 py-2 rounded hover:bg-blue-500"
                            >
                                Twitter
                            </button>
                            <button
                                onClick={() => openInNewTab(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(src)}`)}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                Facebook
                            </button>
                            <button
                                onClick={() =>
                                    openInNewTab(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(src)}`)
                                }
                                className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-900"
                            >
                                LinkedIn
                            </button>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            <input type="text" value={src} readOnly className="flex-1 border p-2 rounded mr-2" />
                            <button onClick={handleCopyUrl} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
                                {showCopySuccess ? "Copied!" : "Copy"}
                            </button>
                        </div>
                        <button
                            onClick={() => setShowShareModal(false)}
                            className="mt-4 w-full bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Expanded view modal */}
            {showExpandedView && (
                <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
                    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-auto">
                        {/* Image container */}
                        <div className="relative overflow-auto max-w-full max-h-full w-full h-full flex items-center justify-center">
                            <img
                                src={src}
                                alt={alt}
                                style={{
                                    transform: `scale(${zoomLevel})`,
                                    transformOrigin: "center center",
                                    maxHeight: "90vh",
                                    maxWidth: "90vw",
                                    objectFit: "contain",
                                }}
                                className="transition-transform duration-200"
                            />
                        </div>

                        {/* Controls */}
                        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/60 px-6 py-3 rounded-full">
                            <button onClick={handleZoomOut} className="text-white hover:text-gray-300 p-2" title="Zoom Out">
                                <ZoomOutIcon className="w-5 h-5" />
                            </button>
                            <span className="text-white">{Math.round(zoomLevel * 100)}%</span>
                            <button onClick={handleZoomIn} className="text-white hover:text-gray-300 p-2" title="Zoom In">
                                <ZoomInIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={handleCloseExpanded}
                            className="fixed top-4 right-4 text-white bg-black/60 hover:bg-black/80 p-2 rounded-full transition-all duration-200"
                            title="Close"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Copy success toast notification */}
            {showCopySuccess && (
                <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg">Copied to clipboard!</div>
            )}
        </div>
    );
};

export default ImageBlock;
