"use client";

import React, { useState } from "react";
import FullScreenOverlay from "@/components/official/FullScreenOverlay";
import { TabDefinition } from "@/components/official/FullScreenOverlay";
import { ImagePreviewRow } from "@/components/image/shared/ImagePreviewRow";
import { Button } from "@/components/ui/button";
import { CloudUpload, User, Clipboard } from "lucide-react";
import { FileUploadWithStorage } from "@/components/ui/file-upload/FileUploadWithStorage";
import { usePasteImageUpload } from "@/components/ui/file-upload/usePasteImageUpload";
import { ImageGrid } from "@/components/image/shared/ImageGrid";
import { useSelectedImages } from "@/components/image/context/SelectedImagesProvider";
import { ResponsiveGallery } from "@/components/image/ResponsiveGallery";

export interface ImageManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: () => void;
    initialSelectionMode?: "single" | "multiple" | "none";
    initialTab?: string;
    initialSearchTerm?: string; // Initial search term for public image search
    userImages?: string[]; // Make userImages optional but don't provide defaults
    enforceSelectionMode?: boolean; // Whether to lock the selection mode so users can't change it
    visibleTabs?: string[]; // Array of tab IDs to display, if empty or undefined, all tabs will be shown
    saveTo?: "public" | "private"; // Where to save uploaded images (convenience method)
    bucket?: string; // Custom storage bucket to use for uploads
    path?: string; // Custom path within the bucket for uploads
}

export function ImageManagerContent({
    isOpen,
    onClose,
    onSave,
    initialSelectionMode = "multiple",
    initialTab = "public-search",
    initialSearchTerm,
    userImages = [], // Default to empty array but don't hardcode sample images
    enforceSelectionMode = false,
    visibleTabs,
    saveTo = "public", // Default to public uploads
    bucket, // No default - will use the one from the hook
    path, // No default - will use the one from the hook
}: Omit<ImageManagerProps, "initialTab"> & { initialTab?: string; initialSearchTerm?: string; userImages?: string[] }) {
    const { selectedImages, selectionMode, setSelectionMode, clearImages, addImage } = useSelectedImages();
    const [activeTab, setActiveTab] = useState(initialTab);
    const [isUploading, setIsUploading] = useState(false);
    const pasteAreaRef = React.useRef<HTMLDivElement>(null);

    // Set selection mode only once on initial render
    React.useEffect(() => {
        setSelectionMode(initialSelectionMode);
        // No dependencies - only run once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    // Clean up selections when the dialog closes to prevent state leaks
    React.useEffect(() => {
        if (!isOpen) {
            // Clean up when closing if no save occurred
            return () => {
                // Don't clear immediately to allow parent to access the selection
                setTimeout(() => {
                    clearImages();
                }, 100);
            };
        }
    }, [isOpen, clearImages]);

    // Handle file uploads
    const handleUploadComplete = (results: { url: string; type: string; details?: any }[]) => {
        // Add uploaded images to selected images
        results.forEach((result) => {
            if (result.type === "image") {
                // Check if we can add this image based on selection mode
                if (selectionMode === "single" && selectedImages.length >= 1) {
                    // In single mode, replace the existing image
                    clearImages();
                }
                
                addImage({
                    type: "public",
                    url: result.url,
                    id: result.details?.localId || result.url,
                    metadata: {
                        description: result.details?.filename || "Uploaded image",
                        title: result.details?.filename || "Uploaded image",
                    },
                });
            }
        });
    };

    // Setup paste image upload - only pass either saveTo OR bucket/path, not both
    const pasteUploadProps = saveTo ? 
        { saveTo: saveTo as "public" | "private" } : 
        (bucket ? { bucket, path } : { saveTo: "public" as "public" | "private" });
    
    const { isProcessing } = usePasteImageUpload({
        ...pasteUploadProps,
        targetRef: pasteAreaRef,
        onImagePasted: (result) => {
            // Check if we can add this image based on selection mode
            if (selectionMode === "single" && selectedImages.length >= 1) {
                // In single mode, replace the existing image
                clearImages();
            }
            
            addImage({
                type: "public",
                url: result.url,
                id: result.url,
                metadata: {
                    description: "Pasted image",
                    title: "Pasted image",
                },
            });
        },
    });

    const handleSave = () => {
        if (onSave) {
            onSave();
        }
        onClose();
    };

    const handleCancel = () => {
        clearImages();
        onClose();
    };

    // Define all available tabs
    const allTabs: TabDefinition[] = [
        {
            id: "public-search",
            label: "Public Images",
            content: (
                <div className="h-full flex flex-col">
                    <div className="flex-1 p-4 overflow-auto">
                        <ResponsiveGallery 
                          type="unsplash" 
                          initialSearchTerm={initialSearchTerm}
                        />
                    </div>
                </div>
            ),
        },
        {
            id: "user-images",
            label: "Your Images",
            content: (
                <div className="h-full flex flex-col">
                    <div className="flex-1 p-4 overflow-auto">
                        {userImages.length > 0 ? (
                            <ImageGrid
                                images={userImages.map((url, index) => ({
                                    type: "public",
                                    url,
                                    id: `user-image-${index}`,
                                    metadata: {
                                        description: `User image ${index + 1}`,
                                        title: `Image ${index + 1}`,
                                    },
                                }))}
                                columns={3}
                                gap="md"
                                aspectRatio="1:1"
                                selectable={true}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full p-8 text-gray-500 dark:text-gray-400">
                                <div className="text-center">
                                    <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                                        <User className="h-8 w-8 text-gray-400 dark:text-gray-600" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">No images available</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                                        You don't have any images yet. Upload some images or use the Public Images tab to find images.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: "upload-images",
            label: "Upload",
            content: (
                <div className="h-full flex flex-col">
                    <div className="flex-1 p-4 overflow-auto">
                        <div className="max-w-2xl mx-auto">
                            <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Upload Images</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Upload images from your device. Selected images will appear in the preview below.
                            </p>

                            <FileUploadWithStorage
                                {...(saveTo ? { saveTo } : (bucket ? { bucket, path } : { saveTo: "public" }))}
                                multiple={true}
                                onUploadComplete={handleUploadComplete}
                                onUploadStatusChange={setIsUploading}
                            />

                            {selectedImages.length > 0 && (
                                <div className="mt-8">
                                    <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Selected Images</h4>
                                    <ImagePreviewRow size="m" showRemoveButton={true} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: "paste-images",
            label: "Paste",
            content: (
                <div className="h-full flex flex-col" ref={pasteAreaRef}>
                    <div className="flex-1 p-4 overflow-auto">
                        <div className="max-w-2xl mx-auto">
                            <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Paste Images</h3>

                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center bg-gray-50 dark:bg-gray-800">
                                <Clipboard className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                                <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">Paste Image from Clipboard</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Copy an image and press{" "}
                                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl</kbd> +{" "}
                                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">V</kbd> to paste it here.
                                </p>

                                {isProcessing && (
                                    <div className="mt-4 flex justify-center">
                                        <div className="flex items-center gap-2">
                                            <svg
                                                className="animate-spin h-5 w-5 text-blue-500"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Processing image...
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {selectedImages.length > 0 && (
                                <div className="mt-8">
                                    <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Selected Images</h4>
                                    <ImagePreviewRow size="m" showRemoveButton={true} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: "quick-upload",
            label: "Quick Upload",
            content: (
                <div className="h-full flex flex-col">
                    <div className="flex-1 p-4 overflow-auto">
                        <div className="max-w-2xl mx-auto">
                            <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Quick Upload</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Use this compact uploader for quick image uploads.
                            </p>

                            <FileUploadWithStorage
                                {...(saveTo ? { saveTo } : (bucket ? { bucket, path } : { saveTo: "public" }))}
                                multiple={true}
                                useMiniUploader={true}
                                onUploadComplete={handleUploadComplete}
                                onUploadStatusChange={setIsUploading}
                            />

                            {selectedImages.length > 0 && (
                                <div className="mt-8">
                                    <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Selected Images</h4>
                                    <ImagePreviewRow size="m" showRemoveButton={true} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: "cloud-images",
            label: "Cloud Storage",
            content: (
                <div className="h-full flex items-center justify-center">
                    <div className="text-center p-8 max-w-md">
                        <CloudUpload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Cloud Storage</h3>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Cloud storage integration coming soon. This will allow you to access images from your Supabase storage.
                        </p>
                    </div>
                </div>
            ),
        },
        {
          id: "image-generation",
          label: "Image Generation",
          content: (
              <div className="h-full flex items-center justify-center">
                  <div className="text-center p-8 max-w-md">
                      <CloudUpload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Image Generation</h3>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          Image generation coming soon. This will allow you to generate images from text.
                      </p>
                  </div>
              </div>
          ),
      },
    ];

    // Filter tabs based on visibleTabs prop
    const tabs = visibleTabs && visibleTabs.length > 0
        ? allTabs.filter(tab => visibleTabs.includes(tab.id))
        : allTabs;

    // If the initially active tab is not in the visible tabs, default to the first visible tab
    React.useEffect(() => {
        if (visibleTabs && visibleTabs.length > 0 && !visibleTabs.includes(activeTab)) {
            setActiveTab(visibleTabs[0]);
        }
    }, [visibleTabs, activeTab]);

    return (
        <FullScreenOverlay
            isOpen={isOpen}
            onClose={onClose}
            title="Image Manager"
            description="Select and manage images"
            tabs={tabs}
            initialTab={activeTab}
            onTabChange={setActiveTab}
            showSaveButton={true}
            onSave={handleSave}
            saveButtonLabel={isUploading ? "Uploading..." : "Use Selected Images"}
            saveButtonDisabled={isUploading}
            showCancelButton={true}
            onCancel={handleCancel}
            cancelButtonLabel="Cancel"
            footerContent={
                <div className="flex items-center mr-auto">
                    <div className="mr-4 flex items-center">
                        {!enforceSelectionMode && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={selectionMode === "single" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectionMode("single")}
                                    className="mr-2"
                                    disabled={isUploading}
                                >
                                    Single
                                </Button>
                                <Button
                                    variant={selectionMode === "multiple" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectionMode("multiple")}
                                    disabled={isUploading}
                                >
                                    Multiple
                                </Button>
                            </div>
                        )}
                        
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedImages.length} image{selectedImages.length !== 1 ? "s" : ""} selected
                        </div>
                    </div>

                    <div className="w-64">
                        <ImagePreviewRow size="s" />
                    </div>
                </div>
            }
        />
    );
}

export function ImageManager(props: ImageManagerProps) {
    return <ImageManagerContent {...props} />;
}
