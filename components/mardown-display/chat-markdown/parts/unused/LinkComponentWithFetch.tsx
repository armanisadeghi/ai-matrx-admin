"use client";
import React, { useRef } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/styles/themes/utils";
import { useState, useEffect } from "react";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

// Define the OpenGraphMetaData interface
interface OpenGraphMetaData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

// Custom Link Component with Preview
export const LinkComponentWithFetch = ({ href, children }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [preview, setPreview] = useState<OpenGraphMetaData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isHovered && !preview && !loading) {
      setLoading(true);
      fetch(`/api/link-preview?url=${encodeURIComponent(href)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setPreview(data);
        })
        .catch((err) => {
          console.error("Failed to fetch preview:", err);
          setPreview({ url: href }); // Fallback to just the URL
        })
        .finally(() => setLoading(false));
    }
  }, [isHovered, href, preview, loading]);

  return (
    <span className="relative inline-block">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "text-blue-500 underline font-medium text-md",
          "transition-all duration-200",
          isHovered && "text-blue-700 bg-blue-100 rounded px-1"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
      </a>
      {isHovered && (
        <div
          className={cn(
            "absolute z-10 p-2 bg-white border rounded shadow-md text-sm text-gray-700",
            "w-64 mt-1 left-0"
          )}
        >
          {loading ? (
            <p>Loading preview...</p>
          ) : preview ? (
            <div>
              {preview.image && (
                <img
                  src={preview.image}
                  alt="Link preview"
                  className="w-full h-32 object-cover rounded mb-1"
                />
              )}
              <p className="font-semibold">{preview.title || "No title available"}</p>
              <p className="text-xs">{preview.description || "No description available"}</p>
              <p className="text-xs text-blue-500 truncate">{preview.url}</p>
            </div>
          ) : (
            <p>No preview available</p>
          )}
        </div>
      )}
    </span>
  );
};

export default LinkComponentWithFetch;