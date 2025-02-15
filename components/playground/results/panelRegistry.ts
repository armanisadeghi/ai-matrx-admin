import { MessageSquare, FileText, Code2, Gem, FormInput, Image, Sparkles, FileCode } from 'lucide-react';
import { ResultPanel } from './ResultPanel';
import { EnhancedResultsPanel } from './EnhancedResultsPanel';
import { CodePanel } from './CodePanel';
import { PanelConfig } from './types';

export const PANEL_REGISTRY: Record<string, PanelConfig> = {
    text: {
        id: 'text',
        component: ResultPanel,
        icon: MessageSquare,
        label: 'Text',
        value: 'text',
        defaultProps: {}
    },
    markdown: {
        id: 'markdown',
        component: ResultPanel,
        icon: FileText,
        label: 'Markdown',
        value: 'markdown',
        defaultProps: {}
    },
    enhanced: {
        id: 'enhanced',
        component: EnhancedResultsPanel,
        icon: Gem,
        label: 'Enhanced',
        value: 'enhanced',
        defaultProps: {}
    },
    code: {
        id: 'code',
        component: CodePanel,
        icon: Code2,
        label: 'Code',
        value: 'code',
        defaultProps: {}
    },
    form: {
        id: 'form',
        component: ResultPanel,
        icon: FormInput,
        label: 'Form',
        value: 'form',
        defaultProps: {}
    },
    image: {
        id: 'image',
        component: ResultPanel,
        icon: Image,
        label: 'Image',
        value: 'image',
        defaultProps: {}
    },
    dynamic: {
        id: 'dynamic',
        component: ResultPanel,
        icon: Sparkles,
        label: 'Dynamic',
        value: 'dynamic',
        defaultProps: {}
    },
    compiled: {
        id: 'compiled',
        component: ResultPanel,
        icon: FileCode,
        label: 'Compiled',
        value: 'compiled',
        defaultProps: {}
    }
};
