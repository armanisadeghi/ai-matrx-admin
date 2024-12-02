// File Location: components/socket/actions/SocketActions.tsx

import { Button } from '@/components/ui';
import { Plus, Send, Trash2 } from 'lucide-react';

interface SocketActionsProps {
    onAddTask: () => void;
    onSend: () => void;
    onClear: () => void;
}

export function SocketActions({ onAddTask, onSend, onClear }: SocketActionsProps) {
    return (
        <div className="flex justify-between items-center mt-6">
            <Button
                variant="outline"
                onClick={onAddTask}
                className="w-32"
            >
                <Plus className="h-4 w-4 mr-2" /> Add Task
            </Button>

            <div className="flex space-x-2">
                <Button
                    variant="secondary"
                    onClick={onClear}
                    className="w-32"
                >
                    <Trash2 className="h-4 w-4 mr-2" /> Clear
                </Button>
                <Button
                    variant="default"
                    onClick={onSend}
                    className="w-32"
                >
                    <Send className="h-4 w-4 mr-2" /> Send
                </Button>
            </div>
        </div>
    );
}
