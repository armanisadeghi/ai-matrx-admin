// app/entity-browser/page.tsx

import { Card } from '@/components/ui/card';
import EntityBrowserContent from './EntityBrowserContent';




export default function EntityBrowserPage() {
    return (
        <Card className="overflow-hidden">
            <EntityBrowserContent />
        </Card>
    );
}
