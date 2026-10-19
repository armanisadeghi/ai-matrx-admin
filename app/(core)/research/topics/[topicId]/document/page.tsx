// record-view: none — a sub-view (document) inside a record or scope, not the record page; the record's own page carries the section
import DocumentViewer from '@/features/research/components/document/DocumentViewer';
import { readLayoutCookie } from '@/features/resizable-panels/readLayoutCookie';

export default async function DocumentPage() {
    const defaultLayout = await readLayoutCookie('panels:research-document-reader');
    return <DocumentViewer defaultLayout={defaultLayout} />;
}
