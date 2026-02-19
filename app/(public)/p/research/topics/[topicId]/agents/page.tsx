import { Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AgentsPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60dvh] p-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-primary" />
            </div>
            <div className="flex items-center gap-2 mb-3">
                <h1 className="text-xl font-bold">Agents</h1>
                <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
            </div>
            <p className="text-muted-foreground text-sm max-w-md">
                Configure and manage the AI agents that power your research pipeline —
                page summarizers, keyword synthesizers, report generators, and more.
            </p>
        </div>
    );
}
