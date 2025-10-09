// Content block templates for the rich text editor
import { 
    FileText, Code, List, CheckSquare, Table, Calendar, AlertCircle, Info, Lightbulb, Quote, MessageSquare, Brain, Zap, Layers, ClipboardList, BookOpen,
    Clock, BarChart3, HelpCircle, FolderOpen, GitBranch, Search, Network 
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { 
    deepThinkingTemplate, 
    simpleThinkingTemplate, 
    flashcardsTemplate, 
    multipleChoiceQuizTemplate, 
    deepResearchReportTemplate,
    timelineTemplate,
    progressTrackerTemplate,
    troubleshootingTemplate,
    resourcesTemplate,
    comparisonTableTemplate,
    decisionTreeTemplate,
    diagramTemplate
} from './templates';

export interface ContentBlock {
    id: string;
    label: string;
    description: string;
    icon: LucideIcon;
    category: 'structure' | 'formatting' | 'special' | 'ai-prompts';
    template: string;
}


export const contentBlocks: ContentBlock[] = [
    // Structure blocks
    {
        id: 'heading-1',
        label: 'Heading 1',
        description: 'Large section heading',
        icon: FileText,
        category: 'structure',
        template: '# Heading 1\n',
    },
    {
        id: 'heading-2',
        label: 'Heading 2',
        description: 'Medium section heading',
        icon: FileText,
        category: 'structure',
        template: '## Heading 2\n',
    },
    {
        id: 'heading-3',
        label: 'Heading 3',
        description: 'Small section heading',
        icon: FileText,
        category: 'structure',
        template: '### Heading 3\n',
    },
    {
        id: 'paragraph',
        label: 'Paragraph',
        description: 'Standard text paragraph',
        icon: FileText,
        category: 'structure',
        template: '\n\n',
    },
    {
        id: 'bullet-list',
        label: 'Bullet List',
        description: 'Unordered list',
        icon: List,
        category: 'structure',
        template: '• Item 1\n• Item 2\n• Item 3\n',
    },
    {
        id: 'numbered-list',
        label: 'Numbered List',
        description: 'Ordered list',
        icon: List,
        category: 'structure',
        template: '1. Item 1\n2. Item 2\n3. Item 3\n',
    },
    {
        id: 'checklist',
        label: 'Checklist',
        description: 'Task list with checkboxes',
        icon: CheckSquare,
        category: 'structure',
        template: '☐ Task 1\n☐ Task 2\n☐ Task 3\n',
    },
    
    // Formatting blocks
    {
        id: 'code-block',
        label: 'Code Block',
        description: 'Formatted code snippet',
        icon: Code,
        category: 'formatting',
        template: '```\ncode here\n```\n',
    },
    {
        id: 'inline-code',
        label: 'Inline Code',
        description: 'Inline code formatting',
        icon: Code,
        category: 'formatting',
        template: '`code`',
    },
    {
        id: 'blockquote',
        label: 'Quote Block',
        description: 'Blockquote or citation',
        icon: Quote,
        category: 'formatting',
        template: '> Quote text here\n',
    },
    {
        id: 'divider',
        label: 'Divider',
        description: 'Horizontal rule',
        icon: FileText,
        category: 'formatting',
        template: '\n---\n',
    },
    
    // Special blocks
    {
        id: 'table',
        label: 'Table',
        description: '3x3 table template',
        icon: Table,
        category: 'special',
        template: '| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n',
    },
    {
        id: 'date',
        label: 'Current Date',
        description: 'Insert today\'s date',
        icon: Calendar,
        category: 'special',
        template: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    },
    {
        id: 'timestamp',
        label: 'Timestamp',
        description: 'Insert current date and time',
        icon: Calendar,
        category: 'special',
        template: new Date().toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        }),
    },
    {
        id: 'note-info',
        label: 'Info Note',
        description: 'Information callout',
        icon: Info,
        category: 'special',
        template: 'ℹ️ Info: Note text here\n',
    },
    {
        id: 'note-warning',
        label: 'Warning Note',
        description: 'Warning callout',
        icon: AlertCircle,
        category: 'special',
        template: '⚠️ Warning: Warning text here\n',
    },
    {
        id: 'note-tip',
        label: 'Tip Note',
        description: 'Helpful tip callout',
        icon: Lightbulb,
        category: 'special',
        template: '💡 Tip: Tip text here\n',
    },
    {
        id: 'todo',
        label: 'TODO Item',
        description: 'Action item marker',
        icon: CheckSquare,
        category: 'special',
        template: 'TODO: Task description\n',
    },
    {
        id: 'comment',
        label: 'Comment',
        description: 'Editorial comment',
        icon: MessageSquare,
        category: 'special',
        template: '// Comment: Add your comment here\n',
    },

    // AI Prompt Templates
    {
        id: 'deep-thinking',
        label: 'Deep Thinking Prompt',
        description: 'Advanced reasoning and analysis prompt',
        icon: Brain,
        category: 'ai-prompts',
        template: deepThinkingTemplate,
    },
    {
        id: 'simple-thinking',
        label: 'Simple Thinking Prompt',
        description: 'Basic thinking process prompt',
        icon: Zap,
        category: 'ai-prompts',
        template: simpleThinkingTemplate,
    },
    {
        id: 'flashcards',
        label: 'Flashcards Template',
        description: 'Generate flashcard format',
        icon: Layers,
        category: 'ai-prompts',
        template: flashcardsTemplate,
    },
    {
        id: 'multiple-choice-quiz',
        label: 'Multiple Choice Quiz',
        description: 'Generate quiz in JSON format',
        icon: ClipboardList,
        category: 'ai-prompts',
        template: multipleChoiceQuizTemplate,
    },
    {
        id: 'deep-research-report',
        label: 'Deep Research Report',
        description: 'Comprehensive research analysis template',
        icon: BookOpen,
        category: 'ai-prompts',
        template: deepResearchReportTemplate,
    },
    {
        id: 'timeline',
        label: 'Timeline',
        description: 'Interactive project timeline with milestones',
        icon: Clock,
        category: 'ai-prompts',
        template: timelineTemplate,
    },
    {
        id: 'resource-collection',
        label: 'Resource Collection',
        description: 'Organized learning resources and materials',
        icon: FolderOpen,
        category: 'ai-prompts',
        template: resourcesTemplate,
    },
    {
        id: 'progress-tracker',
        label: 'Progress Tracker',
        description: 'Track learning or project progress',
        icon: BarChart3,
        category: 'ai-prompts',
        template: progressTrackerTemplate,
    },
    {
        id: 'troubleshooting-guide',
        label: 'Troubleshooting Guide',
        description: 'Problem diagnosis and solution guide',
        icon: HelpCircle,
        category: 'ai-prompts',
        template: troubleshootingTemplate,
    },
    {
        id: 'resource-collection',
        label: 'Resource Collection',
        description: 'Organized collection of learning resources',
        icon: FolderOpen,
        category: 'ai-prompts',
        template: resourcesTemplate,
    },
    {
        id: 'comparison-table',
        label: 'Comparison Table',
        description: 'Interactive comparison matrix in JSON format',
        icon: Table,
        category: 'ai-prompts',
        template: comparisonTableTemplate,
    },
    {
        id: 'decision-tree',
        label: 'Decision Tree',
        description: 'Interactive decision tree in JSON format',
        icon: GitBranch,
        category: 'ai-prompts',
        template: decisionTreeTemplate,
    },
    {
        id: 'interactive-diagram',
        label: 'Interactive Diagram',
        description: 'Flowchart, mindmap, or org chart in JSON format',
        icon: Network,
        category: 'ai-prompts',
        template: diagramTemplate,
    },
];

export const getBlocksByCategory = (category: ContentBlock['category']) => {
    return contentBlocks.filter(block => block.category === category);
};

export const getBlockById = (id: string) => {
    return contentBlocks.find(block => block.id === id);
};

