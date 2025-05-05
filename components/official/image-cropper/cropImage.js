// cropImage.js
'use client';

export const getCroppedImg = async (imageSrc, pixelCrop) => {
    // Create an image element from our image source
    const createImage = (url) =>
      new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        
        // This is crucial for avoiding "tainted canvas" errors
        // when the image is from a data URL (which it will be when using FileReader)
        if (url.startsWith('data:')) {
          image.src = url;
        } else {
          image.crossOrigin = 'anonymous';
          image.src = url;
        }
      });
  
    try {
      const image = await createImage(imageSrc);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
  
      // Set proper canvas dimensions
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
  
      // Draw the cropped image
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
  
      // As Base64 (as an alternative if toBlob fails)
      // return canvas.toDataURL('image/jpeg');
  
      // Return as a Blob
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg');
      });
    } catch (e) {
      console.error('Error in getCroppedImg:', e);
      throw e;
    }
  };
  