// utils/imageCompression.ts
export interface ImageCompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0 to 1
    type?: 'image/jpeg' | 'image/png';
}

export async function compressImage(
    imageData: string,
    options: ImageCompressionOptions = {}
): Promise<string> {
    const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 0.8,
        type = 'image/jpeg'
    } = options;

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            // Calculate new dimensions while maintaining aspect ratio
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }

            // Create canvas and context
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Draw and compress
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to desired format
            const compressedData = canvas.toDataURL(type, quality);
            resolve(compressedData);
        };

        img.onerror = () => {
            reject(new Error('Failed to load image'));
        };

        img.src = imageData;
    });
}

export async function generateThumbnail(
    imageData: string,
    maxWidth: number = 400
): Promise<string> {
    return compressImage(imageData, {
        maxWidth,
        maxHeight: maxWidth,
        quality: 0.6,
        type: 'image/jpeg'
    });
}
