import type { PlaygroundDemo } from "../types";

/** react-pdf rendering a PDF that arrives inside data as a data: URI. */
const source = String.raw`import React from "react";
import { FileText } from "lucide-react";
import { Document, Page } from "react-pdf";
import { KindHeaderBar } from "@/components/kind-kit/KindHeaderBar";
import { KindPanel } from "@/components/kind-kit/KindPanel";
import { StreamingSkeleton, useStreamingValue, streamText } from "@/components/kind-kit/StreamingSkeleton";

export default function InvoicePdf({ data }) {
  const { value: title, arrived } = useStreamingValue(data?.title, "");
  const pdf = streamText(data?.pdf, "");
  const [pages, setPages] = React.useState(0);
  const [error, setError] = React.useState(null);
  if (!arrived && !pdf) return <StreamingSkeleton layout="text" rows={5} />;
  return (
    <div className="@container flex flex-col gap-2">
      <KindHeaderBar
        title={title || "Document"}
        icon={FileText}
        stats={pages ? [{ label: "pages", value: pages }] : []}
        copy={{ label: "Invoice", human: () => title, json: () => ({ title }) }}
      />
      <KindPanel title="Preview" icon={FileText}>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {pdf.startsWith("data:application/pdf") ? (
          <Document file={pdf} onLoadSuccess={(doc) => setPages(doc.numPages)} onLoadError={(e) => setError(String(e?.message ?? e))}>
            <Page pageNumber={1} width={300} renderTextLayer={false} renderAnnotationLayer={false} />
          </Document>
        ) : (
          <StreamingSkeleton layout="text" rows={3} header={false} />
        )}
      </KindPanel>
    </div>
  );
}
`;

export const INVOICE_PDF_DEMO: PlaygroundDemo = {
  slug: "playground_invoice_pdf",
  title: "Invoice PDF",
  covers: ["react-pdf"],
  source,
  sample: {
    title: "Harbor Roasters invoice 1042",
    pdf: "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAzMDAgMTQwXSAvQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4gPj4gPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCAxMTIgPj4Kc3RyZWFtCkJUIC9GMSAxNiBUZiAyNCA5NiBUZCAoSGFyYm9yIFJvYXN0ZXJzIGludm9pY2UgMTA0MikgVGogMCAtMjggVGQgL0YxIDEyIFRmIChEdWUgQXByaWwgMTUgIFRvdGFsICQxLDI4NC4wMCkgVGogRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAowMDAwMDAwMjQxIDAwMDAwIG4gCjAwMDAwMDA0MDQgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSA2IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgo0NzQKJSVFT0YK",
  },
};
