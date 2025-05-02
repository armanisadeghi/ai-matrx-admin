"use client";
import { useState } from "react";
import { ImageCropperWithSelect, EasyImageCropper } from "@/components/official/image-cropper";


const squareOnly = [
  { label: 'Square (1:1)', value: 1 / 1 }
];

const landscapeOptions = [
  { label: 'Landscape (16:9)', value: 16 / 9 },
  { label: 'Landscape (3:2)', value: 3 / 2 },
  { label: 'Landscape (4:3)', value: 4 / 3 },
];

const SixteenNine = [
    { label: 'Sixteen Nine (16:9)', value: 16 / 9 }
  ];
  

export default function ImageCroppingPage() {
    const [croppedUrl1, setCroppedUrl1] = useState("");
    const [croppedUrl2, setCroppedUrl2] = useState("");
    const [croppedUrl3, setCroppedUrl3] = useState("");
    const [croppedUrl4, setCroppedUrl4] = useState("");

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold mb-6">Image Cropping Demo</h1>
            <div className="max-w-5xl mx-auto space-y-12">
                {/* Example 1: Default options */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Example 1: All aspect ratios (default)</h2>
                    <ImageCropperWithSelect onComplete={setCroppedUrl1} />
                </div>

                {/* Example 2: Square only */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Example 2: Square only</h2>
                    <ImageCropperWithSelect 
                        onComplete={setCroppedUrl2} 
                        aspectRatios={squareOnly}
                    />
                </div>

                {/* Example 3: Landscape options */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Example 3: Landscape options only</h2>
                    <ImageCropperWithSelect 
                        onComplete={setCroppedUrl3} 
                        aspectRatios={landscapeOptions}
                    />
                </div>
                {/* Example 4: Easy Image Cropper */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Example 4: Easy Image Cropper</h2>
                    <EasyImageCropper onComplete={setCroppedUrl4} aspectRatios={SixteenNine} />
                </div>
            </div>
        </div>
    );
}
