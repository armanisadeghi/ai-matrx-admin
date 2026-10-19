// record-view: none — a sub-view (synthesis) inside a record or scope, not the record page; the record's own page carries the section
import SynthesisList from '@/features/research/components/synthesis/SynthesisList';
import { readLayoutCookie } from '@/features/resizable-panels/readLayoutCookie';

export default async function SynthesisPage() {
    const defaultLayout = await readLayoutCookie('panels:research-synthesis-reader');
    return <SynthesisList defaultLayout={defaultLayout} />;
}
