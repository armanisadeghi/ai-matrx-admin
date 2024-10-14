'use client';
import { useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

const toKebabCase = (str: string) => {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const getFileExtension = (url: string) => {
    const extension = url.split('.').pop();
    return extension && extension.length <= 4 ? `.${extension}` : '.png';
};

const useDownloadImage = (src: string, alt: string) => {
    const { toast } = useToast();

    const downloadImage = useCallback(
        async (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                const response = await fetch(src);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);

                const link = document.createElement('a');
                const kebabAlt = toKebabCase(alt);
                const extension = getFileExtension(src);
                const filename = `ai-matrix-${kebabAlt}${extension}`;

                link.href = blobUrl;
                link.download = filename;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);

                toast({ title: "Image download started!" });
            } catch (err) {
                console.error('Failed to download image: ', err);
                toast({ title: "Failed to download image", variant: "destructive" });
            }
        },
        [src, alt, toast]
    );

    return downloadImage;
};

export default useDownloadImage;
