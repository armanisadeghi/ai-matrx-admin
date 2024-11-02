// config/applet-definitions.tsx

import {
    Brain, Bot, GitBranch, Wrench, ArrowRightCircle,
    HardDrive, GraduationCap, ShoppingBag, Database, Book,
    Image, MessageCircle, Mic, Code, Download, Megaphone,
    Camera, Video, Globe, Mail, Calendar, CheckSquare,
    FileText, Layers, Calculator, BookOpen, Play, School
} from 'lucide-react';
import {AppletDefinition} from "@/types/applets/types";


export const appletDefinitions: AppletDefinition[] = [
    {
        key: "ai-models",
        title: "AI Models",
        description: "Manage and interact with various AI models",
        icon: <Brain size={24} />,
        category: "AI",
        link: "/applets/ai-models",
        features: ["Model Management", "Version Control", "Performance Monitoring"]
    },
    {
        key: "ai-agents",
        title: "AI Agents",
        description: "Create and manage autonomous AI agents",
        icon: <Bot size={24} />, // Changed from Robot to Bot
        category: "AI",
        link: "/applets/ai-agents",
        features: ["Agent Creation", "Behavior Configuration", "Task Assignment"]
    },
    {
        key: "workflows",
        title: "Workflows",
        description: "Design automated workflows and processes",
        icon: <GitBranch size={24} />, // Changed from Flow to GitBranch
        category: "Automation",
        link: "/applets/workflows",
        features: ["Visual Flow Builder", "Automation Rules", "Workflow Templates"]
    },
    {
        key: "recipes",
        title: "Recipes",
        description: "Create and share automation recipes",
        icon: <BookOpen size={24} />,
        category: "Automation",
        link: "/applets/recipes",
        features: ["Recipe Creation", "Template Library", "Sharing Options"]
    },
    {
        key: "actions",
        title: "Actions",
        description: "Configure and manage automated actions",
        icon: <Play size={24} />,
        category: "Automation",
        link: "/applets/actions",
        features: ["Action Library", "Custom Actions", "Scheduling"]
    },
    {
        key: "tools",
        title: "Tools",
        description: "Access AI-powered productivity old-tools",
        icon: <Wrench size={24} />, // Changed from Tool to Wrench
        category: "Automation",
        link: "/applets/tools",
        features: ["Tool Integration", "Custom Tools", "Settings"]
    },
    {
        key: "info-brokers",
        title: "Info Brokers",
        description: "Manage information flow between systems",
        icon: <Database size={24} />,
        category: "Automation",
        link: "/applets/info-brokers",
        features: ["Data Routing", "Format Conversion", "Integration"]
    },
    {
        key: "data-transformers",
        title: "Data Transformers",
        description: "Transform and process data formats",
        icon: <ArrowRightCircle size={24} />, // Changed from Transform to ArrowRightCircle
        category: "Automation",
        link: "/applets/data-transformers",
        features: ["Format Conversion", "Data Cleaning", "Validation"]
    },
    {
        key: "knowledgebase",
        title: "Knowledgebase",
        description: "Build and manage knowledge repositories",
        icon: <Book size={24} />,
        category: "Data Management",
        link: "/applets/knowledgebase",
        features: ["Content Organization", "Search", "Versioning"]
    },
    {
        key: "ai-memory",
        title: "AI Memory",
        description: "Manage AI system memory and context",
        icon: <HardDrive size={24} />, // Changed from Memory to HardDrive
        category: "AI",
        link: "/applets/ai-memory",
        features: ["Context Management", "Memory Optimization", "Persistence"]
    },
    {
        key: "ai-training",
        title: "AI Training",
        description: "Train and fine-tune AI models",
        icon: <School size={24} />,
        category: "AI",
        link: "/applets/ai-training",
        features: ["Model Training", "Dataset Management", "Performance Metrics"]
    },
    {
        key: "imagen",
        title: "Imagen AI",
        description: "Generate and edit images with AI",
        icon: <Image size={24} />,
        category: "Media",
        link: "/applets/imagen",
        features: ["Image Generation", "Editing", "Style Transfer"]
    },
    {
        key: "ai-chat",
        title: "AI Chat",
        description: "Chat with AI assistants",
        icon: <MessageCircle size={24} />,
        category: "Communication",
        link: "/applets/ai-chat",
        features: ["Chat Interface", "Multiple Personas", "History"]
    },
    {
        key: "ai-voice",
        title: "AI Voice",
        description: "Voice synthesis and recognition",
        icon: <Mic size={24} />,
        category: "Media",
        link: "/applets/ai-voice",
        features: ["Text-to-Speech", "Speech Recognition", "Voice Cloning"]
    },
    {
        key: "code-assist",
        title: "CodeAssist",
        description: "AI-powered coding assistance",
        icon: <Code size={24} />,
        category: "Development",
        link: "/applets/code-assist",
        features: ["Code Completion", "Refactoring", "Documentation"]
    },
    {
        key: "scraper",
        title: "Scraper",
        description: "Web scraping and data extraction",
        icon: <Download size={24} />,
        category: "Data Management",
        link: "/applets/scraper",
        features: ["Web Scraping", "Data Extraction", "Scheduling"]
    },
    {
        key: "marketing",
        title: "Marketing",
        description: "AI-powered marketing old-tools",
        icon: <Megaphone size={24} />,
        category: "Business",
        link: "/applets/marketing",
        features: ["Campaign Management", "Analytics", "Automation"]
    },
    {
        key: "photos",
        title: "Photos",
        description: "Manage and edit photos",
        icon: <Camera size={24} />,
        category: "Media",
        link: "/applets/photos",
        features: ["Photo Management", "Editing", "Organization"]
    },
    {
        key: "videos",
        title: "Videos",
        description: "Video creation and editing",
        icon: <Video size={24} />,
        category: "Media",
        link: "/applets/videos",
        features: ["Video Editing", "Generation", "Management"]
    },
    {
        key: "website",
        title: "Website",
        description: "Website building and management",
        icon: <Globe size={24} />,
        category: "Business",
        link: "/applets/website",
        features: ["Site Builder", "Analytics", "SEO Tools"]
    },
    {
        key: "store",
        title: "Store",
        description: "E-commerce management",
        icon: <ShoppingBag size={24} />, // Changed from Shopping to ShoppingBag
        category: "Business",
        link: "/applets/store",
        features: ["Product Management", "Orders", "Analytics"]
    },
    {
        key: "emails",
        title: "Emails",
        description: "Email management and automation",
        icon: <Mail size={24} />,
        category: "Communication",
        link: "/applets/emails",
        features: ["Email Management", "Automation", "Templates"]
    },
    {
        key: "calendar",
        title: "Calendar",
        description: "Schedule and manage events",
        icon: <Calendar size={24} />,
        category: "Productivity",
        link: "/applets/calendar",
        features: ["Event Management", "Scheduling", "Reminders"]
    },
    {
        key: "tasks",
        title: "Tasks",
        description: "Task and project management",
        icon: <CheckSquare size={24} />,
        category: "Productivity",
        link: "/applets/tasks",
        features: ["Task Management", "Projects", "Collaboration"]
    },
    {
        key: "notes",
        title: "Notes",
        description: "Note-taking and organization",
        icon: <FileText size={24} />,
        category: "Productivity",
        link: "/applets/notes",
        features: ["Note Taking", "Organization", "Search"]
    },
    {
        key: "flashcards",
        title: "Flashcards",
        description: "Create and study flashcards",
        icon: <Layers size={24} />, // Changed from Cards to Layers
        category: "Education",
        link: "/applets/flashcards",
        features: ["Card Creation", "Study Sessions", "Progress Tracking"]
    },
    {
        key: "math-tutor",
        title: "Math Tutor",
        description: "AI-powered mathematics tutoring",
        icon: <Calculator size={24} />,
        category: "Education",
        link: "/applets/math-tutor",
        features: ["Problem Solving", "Step-by-Step Solutions", "Practice Exercises"]
    }
];
