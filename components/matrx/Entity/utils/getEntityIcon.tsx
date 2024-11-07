// components/matrx/Entity/utils/getEntityIcon.tsx
import {
    Users, User, Package2, Database, Table, FileText, Settings,
    ShoppingCart, CreditCard, Mail, MessageSquare, Calendar,
    Image, Video, FileBox, Building2, Briefcase, Tags, Tag,
    Map, GanttChart, ListTodo, Bell, Lock, History, Newspaper,
    BookOpen, Receipt, CircleDollarSign, Truck, Phone, Home,
    ClipboardList, BadgeCheck, Gauge, Box, Brain, Cable, FileOutput,
    Monitor, CircleEllipsis, GraduationCap, Library, Cog, Workflow,
    SquareFunction, Goal, Zap, Play, RotateCw, Drill, Wrench,Bolt,
    Binary, Cpu, Stars, Sparkles, Bot, Power, Lightbulb,
    LucideIcon
} from 'lucide-react';


interface IconMatch {
    pattern: string;
    icon: LucideIcon;
    priority: number; // Higher number = higher priority
}

const iconMatches: IconMatch[] = [
    // User related
    { pattern: 'user', icon: User, priority: 10 },
    { pattern: 'users', icon: Users, priority: 11 },
    { pattern: 'account', icon: User, priority: 9 },
    { pattern: 'profile', icon: User, priority: 9 },
    { pattern: 'contact', icon: Phone, priority: 8 },

    // Content & Documents
    { pattern: 'document', icon: FileText, priority: 10 },
    { pattern: 'file', icon: FileText, priority: 9 },
    { pattern: 'content', icon: FileText, priority: 8 },
    { pattern: 'post', icon: Newspaper, priority: 9 },
    { pattern: 'article', icon: Newspaper, priority: 9 },
    { pattern: 'blog', icon: Newspaper, priority: 9 },

    // Commerce & Products
    { pattern: 'product', icon: Package2, priority: 10 },
    { pattern: 'item', icon: Box, priority: 8 },
    { pattern: 'order', icon: ShoppingCart, priority: 10 },
    { pattern: 'cart', icon: ShoppingCart, priority: 11 },
    { pattern: 'payment', icon: CreditCard, priority: 10 },
    { pattern: 'transaction', icon: CircleDollarSign, priority: 10 },
    { pattern: 'invoice', icon: Receipt, priority: 10 },
    { pattern: 'shipping', icon: Truck, priority: 10 },

    // Communication
    { pattern: 'message', icon: MessageSquare, priority: 10 },
    { pattern: 'comment', icon: MessageSquare, priority: 9 },
    { pattern: 'email', icon: Mail, priority: 10 },
    { pattern: 'notification', icon: Bell, priority: 10 },

    // Time & Events
    { pattern: 'event', icon: Calendar, priority: 10 },
    { pattern: 'schedule', icon: Calendar, priority: 9 },
    { pattern: 'appointment', icon: Calendar, priority: 9 },
    { pattern: 'history', icon: History, priority: 8 },
    { pattern: 'log', icon: ClipboardList, priority: 8 },

    // Media
    { pattern: 'image', icon: Image, priority: 10 },
    { pattern: 'photo', icon: Image, priority: 9 },
    { pattern: 'video', icon: Video, priority: 10 },
    { pattern: 'media', icon: FileBox, priority: 8 },

    // Organization
    { pattern: 'company', icon: Building2, priority: 10 },
    { pattern: 'business', icon: Briefcase, priority: 9 },
    { pattern: 'department', icon: Building2, priority: 8 },
    { pattern: 'organization', icon: Building2, priority: 8 },

    // Categorization
    { pattern: 'category', icon: Tags, priority: 10 },
    { pattern: 'tag', icon: Tag, priority: 10 },
    { pattern: 'label', icon: Tag, priority: 9 },
    { pattern: 'type', icon: Tags, priority: 8 },

    // Location
    { pattern: 'location', icon: Map, priority: 10 },
    { pattern: 'address', icon: Home, priority: 9 },
    { pattern: 'place', icon: Map, priority: 8 },

    // Task & Project Management
    { pattern: 'project', icon: GanttChart, priority: 10 },
    { pattern: 'task', icon: ListTodo, priority: 10 },
    { pattern: 'todo', icon: ListTodo, priority: 10 },
    { pattern: 'status', icon: Gauge, priority: 8 },

    // Security & Settings
    { pattern: 'permission', icon: Lock, priority: 10 },
    { pattern: 'role', icon: BadgeCheck, priority: 10 },
    { pattern: 'setting', icon: Settings, priority: 10 },
    { pattern: 'config', icon: Settings, priority: 9 },

    // Data & System
    { pattern: 'data', icon: Database, priority: 8 },
    { pattern: 'record', icon: Database, priority: 7 },
    { pattern: 'system', icon: Settings, priority: 7 },

    // Documentation
    { pattern: 'documentation', icon: BookOpen, priority: 10 },
    { pattern: 'guide', icon: BookOpen, priority: 9 },
    { pattern: 'manual', icon: BookOpen, priority: 9 },

    { pattern: 'ai', icon: Brain, priority: 11 },
    { pattern: 'ml', icon: Brain, priority: 11 },
    { pattern: 'neural', icon: Brain, priority: 10 },
    { pattern: 'intelligence', icon: Brain, priority: 10 },
    { pattern: 'auto', icon: Bot, priority: 9 },
    { pattern: 'automation', icon: Bot, priority: 10 },
    { pattern: 'robot', icon: Bot, priority: 10 },
    { pattern: 'process', icon: Workflow, priority: 8 },
    { pattern: 'workflow', icon: Workflow, priority: 9 },

    // Data & Processing
    { pattern: 'data', icon: Database, priority: 9 },
    { pattern: 'dataset', icon: Database, priority: 10 },
    { pattern: 'input', icon: Cable, priority: 9 },
    { pattern: 'output', icon: FileOutput, priority: 9 },
    { pattern: 'transform', icon: RotateCw, priority: 8 },
    { pattern: 'conversion', icon: RotateCw, priority: 8 },
    { pattern: 'processing', icon: Cpu, priority: 8 },
    { pattern: 'compute', icon: Cpu, priority: 8 },
    { pattern: 'binary', icon: Binary, priority: 8 },

    // Display & Interface
    { pattern: 'display', icon: Monitor, priority: 9 },
    { pattern: 'screen', icon: Monitor, priority: 9 },
    { pattern: 'view', icon: Monitor, priority: 8 },
    { pattern: 'interface', icon: Monitor, priority: 8 },
    { pattern: 'options', icon: CircleEllipsis, priority: 8 },
    { pattern: 'setting', icon: CircleEllipsis, priority: 8 },
    { pattern: 'preference', icon: CircleEllipsis, priority: 8 },
    { pattern: 'config', icon: Bolt, priority: 8 },

    // Education & Learning
    { pattern: 'education', icon: GraduationCap, priority: 10 },
    { pattern: 'course', icon: GraduationCap, priority: 9 },
    { pattern: 'learning', icon: GraduationCap, priority: 9 },
    { pattern: 'training', icon: GraduationCap, priority: 9 },
    { pattern: 'lesson', icon: BookOpen, priority: 8 },
    { pattern: 'curriculum', icon: GraduationCap, priority: 9 },

    // Sets & Collections
    { pattern: 'set', icon: Library, priority: 7 },
    { pattern: 'collection', icon: Library, priority: 8 },
    { pattern: 'group', icon: Library, priority: 7 },
    { pattern: 'bundle', icon: Package2, priority: 7 },

    // Tools & Functions
    { pattern: 'tool', icon: Drill, priority: 9 },
    { pattern: 'utility', icon: Wrench, priority: 9 },
    { pattern: 'function', icon: SquareFunction, priority: 9 },
    { pattern: 'method', icon: SquareFunction, priority: 8 },
    { pattern: 'operation', icon: Cog, priority: 8 },
    { pattern: 'action', icon: Play, priority: 8 },
    { pattern: 'trigger', icon: Zap, priority: 8 },

    // Features & Enhancements
    { pattern: 'feature', icon: Stars, priority: 8 },
    { pattern: 'enhancement', icon: Sparkles, priority: 8 },
    { pattern: 'improvement', icon: Sparkles, priority: 8 },
    { pattern: 'optimize', icon: Gauge, priority: 8 },
    { pattern: 'power', icon: Power, priority: 8 },
    { pattern: 'idea', icon: Lightbulb, priority: 8 },
    { pattern: 'smart', icon: Brain, priority: 8 },

    // Goals & Objectives
    { pattern: 'goal', icon: Goal, priority: 9 },
    { pattern: 'target', icon: Goal, priority: 9 },
    { pattern: 'objective', icon: Goal, priority: 9 }

];

export const getEntityIcon = (entityName: string): LucideIcon => {
    const nameLower = entityName.toLowerCase();

    // Sort matches by priority (highest first)
    const sortedMatches = [...iconMatches].sort((a, b) => b.priority - a.priority);

    // Find the first matching pattern
    const match = sortedMatches.find(({ pattern }) => nameLower.includes(pattern));

    // Return the matching icon or default to Table
    return match?.icon || Table;
};
