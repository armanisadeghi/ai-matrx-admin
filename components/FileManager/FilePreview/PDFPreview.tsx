// components/FileManager/FilePreview/PDFPreview.tsx
import React from 'react';
import { useFileSystem } from '@/providers/FileSystemProvider';
import { NodeStructure } from '@/utils/file-operations';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker for react-pdf (client-side only)
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PDFPreviewProps {
    file: NodeStructure;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({ file }) => {
    const { getPublicUrlSync, currentBucket } = useFileSystem();
    const [numPages, setNumPages] = React.useState<number>(0);
    const [pageNumber, setPageNumber] = React.useState(1);
    const [scale, setScale] = React.useState(1.0);

    const pdfUrl = currentBucket ? getPublicUrlSync(currentBucket, file.path) : '';

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center p-2 border-b">
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                        disabled={pageNumber <= 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                        Page {pageNumber} of {numPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                        disabled={pageNumber >= numPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setScale(prev => prev - 0.1)}
                        disabled={scale <= 0.5}
                    >
                        -
                    </Button>
                    <span className="text-sm">{Math.round(scale * 100)}%</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setScale(prev => prev + 0.1)}
                        disabled={scale >= 2}
                    >
                        +
                    </Button>
                </div>
            </div>
            <div className="flex-1 overflow-auto flex justify-center p-4">
                <Document
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    }
                >
                    <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        loading={
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        }
                    />
                </Document>
            </div>
        </div>
    );
};
