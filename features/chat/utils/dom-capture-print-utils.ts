/**
 * DOM-Capture Print Utilities — Tier 2 Full-Message Print
 *
 * Captures a rendered DOM element using html2canvas, then pipes it into jsPDF.
 * This handles ALL block types because it screenshots the actual rendered output.
 */

export interface DomCaptureOptions {
    /** Paper size — 'a4' (default) or 'letter' */
    paperSize?: 'a4' | 'letter';
    /** Orientation */
    orientation?: 'portrait' | 'landscape';
    /** Scale factor for html2canvas (higher = sharper, slower). Default: 2 */
    scale?: number;
    /** Background colour for the capture. Default: '#ffffff' */
    background?: string;
    /** Filename for the downloaded PDF (without extension). Default: 'ai-response' */
    filename?: string;
    /** Called after each page is captured, with current page / total estimate */
    onProgress?: (page: number, total: number) => void;
}

const PAGE_DIMS = {
    a4:     { w: 210, h: 297 },   // mm
    letter: { w: 215.9, h: 279.4 },
} as const;

/**
 * Capture a DOM element and export it as a multi-page PDF.
 * Splits content across pages automatically by slicing the canvas.
 */
export async function captureToPDF(
    element: HTMLElement,
    options: DomCaptureOptions = {},
): Promise<void> {
    const {
        paperSize = 'a4',
        orientation = 'portrait',
        scale = 2,
        background = '#ffffff',
        filename = 'ai-response',
        onProgress,
    } = options;

    // Dynamic imports — both are large deps, only load when needed
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
    ]);

    const dims = PAGE_DIMS[paperSize];
    const pageW = orientation === 'portrait' ? dims.w : dims.h;
    const pageH = orientation === 'portrait' ? dims.h : dims.w;

    onProgress?.(0, 1);

    const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        backgroundColor: background,
        logging: false,
        // Expand to full scroll height so we capture off-screen content
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgW = pageW;
    const imgH = (canvas.height * pageW) / canvas.width;

    const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: paperSize,
    });

    let heightLeft = imgH;
    let yOffset = 0;
    let page = 0;

    // First page
    pdf.addImage(imgData, 'PNG', 0, yOffset, imgW, imgH);
    heightLeft -= pageH;
    page++;

    // Additional pages
    const totalPages = Math.ceil(imgH / pageH);
    while (heightLeft > 0) {
        yOffset -= pageH;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, yOffset, imgW, imgH);
        heightLeft -= pageH;
        page++;
        onProgress?.(page, totalPages);
    }

    pdf.save(`${filename}.pdf`);
}

/**
 * Capture a DOM element and open it in a new window for browser print/PDF.
 * This is lighter than captureToPDF — no pdf library needed — but only works
 * for single-page or short content.
 */
export async function captureToClipboardImage(element: HTMLElement): Promise<void> {
    const { default: html2canvas } = await import('html2canvas');

    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
    });

    canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob }),
            ]);
        } catch {
            // Clipboard API not available — download instead
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'capture.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }, 'image/png');
}
