import React, { useRef, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

// Configuration object matching Python script's specs
const CONFIG = {
  pageSettings: {
    size: { width: 612, height: 792 }, // letter size in points
    margin: { 
      top: 36, // 0.5 inch in points
      right: 7.2, // 0.1 inch
      bottom: 36, // 0.5 inch
      left: 13.68 // 0.19 inch
    },
    numColumns: 2,
    numRows: 5
  },
  labelSettings: {
    size: { width: 288, height: 144 }, // 4x2 inches in points
    spaceBetween: { 
      horizontal: 13.68, // 0.19 inch
      vertical: 7.2 // 0.1 inch
    }
  },
  padding: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  },
  elementSettings: {
    qrCode: {
      size: { width: 72, height: 72 }, // 1x1 inch
      position: { left: 5.04, top: 0 } // 0.07 inch from left
    },
    text: [
      { font: 'Helvetica', size: 12, position: { left: 93.6, top: 0 } },
      { font: 'Helvetica', size: 12, position: { left: 93.6, top: 14.4 } },
      { font: 'Helvetica', size: 12, position: { left: 93.6, top: 28.8 } },
      { font: 'Helvetica', size: 12, position: { left: 93.6, top: 43.2 } },
      { font: 'Helvetica', size: 12, position: { left: 93.6, top: 57.6 } },
      { font: 'Helvetica', size: 12, position: { left: 93.6, top: 72 } }
    ],
    sku: {
      font: 'Helvetica-Bold',
      size: 12,
      position: { left: 3.6, top: 86.4 } // 0.05 inch from left, 1.2 inch from top
    }
  }
};

interface LabelEntry {
  qr_value: string;
  text_elements: string[];
}

interface LabelGeneratorProps {
  entries: LabelEntry[];
  onGenerate: (pdfBlob: Blob) => void;
}

const LabelGenerator: React.FC<LabelGeneratorProps> = ({ entries, onGenerate }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    const doc = new jsPDF({
      unit: 'pt',
      format: 'letter'
    });

    const generateQRCode = async (value: string): Promise<string> => {
      return await QRCode.toDataURL(value, {
        width: CONFIG.elementSettings.qrCode.size.width,
        margin: 0,
        errorCorrectionLevel: 'L'
      });
    };

    let currentPage = 0;
    const labelsPerPage = CONFIG.pageSettings.numColumns * CONFIG.pageSettings.numRows;

    for (let i = 0; i < entries.length; i++) {
      if (i > 0 && i % labelsPerPage === 0) {
        doc.addPage();
        currentPage++;
      }

      const entry = entries[i];
      const col = i % CONFIG.pageSettings.numColumns;
      const row = Math.floor((i % labelsPerPage) / CONFIG.pageSettings.numColumns);

      // Calculate label position
      const x = CONFIG.pageSettings.margin.left + 
                col * (CONFIG.labelSettings.size.width + CONFIG.labelSettings.spaceBetween.horizontal);
      const y = CONFIG.pageSettings.margin.top + 
                row * (CONFIG.labelSettings.size.height + CONFIG.labelSettings.spaceBetween.vertical);

      // Add QR Code
      const qrCodeDataUrl = await generateQRCode(entry.qr_value);
      doc.addImage(
        qrCodeDataUrl,
        'PNG',
        x + CONFIG.elementSettings.qrCode.position.left,
        y + CONFIG.elementSettings.qrCode.position.top,
        CONFIG.elementSettings.qrCode.size.width,
        CONFIG.elementSettings.qrCode.size.height
      );

      // Add SKU
      doc.setFont(CONFIG.elementSettings.sku.font);
      doc.setFontSize(CONFIG.elementSettings.sku.size);
      doc.text(
        entry.qr_value,
        x + CONFIG.elementSettings.sku.position.left,
        y + CONFIG.elementSettings.sku.position.top
      );

      // Add text elements
      const identifiers = ['ASIN 1: ', 'ASIN 2: ', 'ASIN 3: ', 'ASIN 4: ', 'ASIN 5: ', 'ASIN 6: '];
      entry.text_elements.forEach((text, index) => {
        if (index < CONFIG.elementSettings.text.length && text.trim()) {
          const textConfig = CONFIG.elementSettings.text[index];
          doc.setFont(textConfig.font);
          doc.setFontSize(textConfig.size);
          const identifier = index < identifiers.length ? identifiers[index] : `Info ${index + 1}: `;
          doc.text(
            identifier + text,
            x + textConfig.position.left,
            y + textConfig.position.top + textConfig.size
          );
        }
      });
    }

    const pdfBlob = doc.output('blob');
    onGenerate(pdfBlob);
    setIsGenerating(false);
  };

  useEffect(() => {
    if (entries.length > 0) {
      generatePDF();
    }
  }, [entries]);

  return (
    <div className="w-full p-4">
      {isGenerating ? (
        <div className="text-center">Generating labels...</div>
      ) : (
        <div className="text-center">Labels generated</div>
      )}
    </div>
  );
};

export default LabelGenerator;