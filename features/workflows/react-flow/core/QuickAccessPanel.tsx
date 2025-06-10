"use client";

import React, { useState, useEffect } from "react";
import {
    Brain,
    Code,
    User,
    Database,
    Mail,
    Calendar,
    FileText,
    Webhook,
    Search,
    ArrowRightLeft,
    Plus,
    Cpu,
    MessageSquare,
    Globe,
    Image,
    Zap,
    Play,
    RotateCcw,
    GitBranch,
    Repeat,
    Wand2,
    // Additional icons for dynamic mapping
    Settings,
    Wrench,
    Filter,
    Layers,
    Package,
    Upload,
    Download,
    Eye,
    Edit,
    Trash,
    Copy,
    Move,
    Link,
    Unlink,
    Lock,
    Unlock,
    Archive,
    Folder,
    FolderOpen,
    File,
    Save,
    RefreshCw,
    RotateCcw as ArrowLeftRight, // Alias for the icon mentioned in the example
} from "lucide-react";
import DatabaseFunctionBrowser from "./DatabaseFunctionBrowser";
import CollapsibleNodeSection from "./CollapsibleNodeSection";
import NodeSelectionOverlay from "./NodeSelectionOverlay";
import CategoryNodeSection from "./CategoryNodeSection";
import CategoryNodeOverlay from "./CategoryNodeOverlay";
import { useCombinedFunctionsWithArgs } from "@/lib/redux/entity/hooks/functions-and-args";

interface QuickAccessPanelProps {
    onAddNode: (id: string, type?: string) => void;
}

// Icon mapping for dynamic icon resolution
const iconMap: Record<string, any> = {
    Brain,
    Code,
    User,
    Database,
    Mail,
    Calendar,
    FileText,
    Webhook,
    Search,
    ArrowRightLeft,
    ArrowLeftRight,
    Plus,
    Cpu,
    MessageSquare,
    Globe,
    Image,
    Zap,
    Play,
    RotateCcw,
    GitBranch,
    Repeat,
    Wand2,
    Settings,
    Wrench,
    Filter,
    Layers,
    Package,
    Upload,
    Download,
    Eye,
    Edit,
    Trash,
    Copy,
    Move,
    Link,
    Unlink,
    Lock,
    Unlock,
    Archive,
    Folder,
    FolderOpen,
    File,
    Save,
    RefreshCw,
};

const QuickAccessPanel: React.FC<QuickAccessPanelProps> = ({ onAddNode }) => {
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);
    const [activeCategoryOverlay, setActiveCategoryOverlay] = useState<string | null>(null);
    
    const { combinedFunctions, isLoading, isError, fetchAll } = useCombinedFunctionsWithArgs();

    useEffect(() => {
        // Only fetch if no data exists (backup fetch)
        if (combinedFunctions.length === 0) {
            fetchAll();
        }
    }, [combinedFunctions.length]);

    const handleAddFunction = (functionId: string) => {
        onAddNode(functionId, "registeredFunction");
    };

    const handleCategoryClick = (categoryId: string) => {
        setActiveCategoryOverlay(categoryId);
    };

    const closeCategoryOverlay = () => {
        setActiveCategoryOverlay(null);
    };

    // Helper function to normalize category names
    const normalizeCategoryName = (category: string): string => {
        if (!category) return "other";
        const normalized = category.toLowerCase();
        const validCategories = ["recipes", "agents", "prompts", "processors", "extractors", "files", "database", "web", "media", "api"];
        return validCategories.includes(normalized) ? normalized : "other";
    };

    // Helper function to resolve icon from string name
    const resolveIcon = (iconName: string | null) => {
        if (!iconName || !iconMap[iconName]) {
            return Zap; // Default fallback icon
        }
        return iconMap[iconName];
    };

    // Define categories with appropriate icons
    const categories = [
        { id: "recipes", icon: Brain, label: "Recipes" },
        { id: "agents", icon: Cpu, label: "Agents" },
        { id: "prompts", icon: MessageSquare, label: "Prompts" },
        { id: "processors", icon: Zap, label: "Processors" },
        { id: "extractors", icon: Code, label: "Extractors" },
        { id: "files", icon: FileText, label: "Files" },
        { id: "database", icon: Database, label: "Database" },
        { id: "web", icon: Globe, label: "Web" },
        { id: "media", icon: Image, label: "Media" },
        { id: "api", icon: Webhook, label: "API" },
        { id: "other", icon: Settings, label: "Other" },
    ];

    // Generate category nodes from registered functions
    const getCategoryNodes = (categoryId: string) => {
        return combinedFunctions
            .filter(func => normalizeCategoryName(func.category) === categoryId)
            .map(func => ({
                id: func.id,
                name: func.name,
                description: func.nodeDescription || func.description?.slice(0, 100) + "..." || "No description available",
                icon: resolveIcon(func.icon),
            }));
    };

    const getCategoryTitle = (categoryId: string) => {
        const titles: Record<string, string> = {
            recipes: "Recipes",
            agents: "Agents", 
            prompts: "Prompts",
            processors: "Processors",
            extractors: "Extractors",
            files: "Files",
            database: "Database Functions",
            web: "Web Services",
            media: "Media Processing",
            api: "API Integrations",
            other: "Other Functions",
        };
        return titles[categoryId] || categoryId;
    };

    // Define integration nodes with descriptions
    const integrationNodes = [
        { 
            id: "userInput", 
            type: "userInput", 
            icon: User, 
            label: "User Input",
            description: "Capture input data from users through forms, prompts, or interactive interfaces."
        },
        { 
            id: "brokerRelay", 
            type: "brokerRelay", 
            icon: ArrowRightLeft, 
            label: "Broker Relay",
            description: "Route and transform data between different systems and services in your workflow."
        },
        { 
            id: "agent", 
            type: "agent", 
            icon: Brain, 
            label: "Agent",
            description: "Deploy AI agents to perform autonomous tasks and decision-making processes."
        },
        { 
            id: "api", 
            type: "api", 
            icon: Webhook, 
            label: "API",
            description: "Connect to external APIs and web services to fetch or send data."
        },
        { 
            id: "database", 
            type: "database", 
            icon: Database, 
            label: "Database",
            description: "Store, retrieve, and manipulate data using various database operations."
        },
        { 
            id: "email", 
            type: "email", 
            icon: Mail, 
            label: "Email",
            description: "Send automated emails, notifications, and communication to users or systems."
        },
        { 
            id: "calendar", 
            type: "calendar", 
            icon: Calendar, 
            label: "Calendar",
            description: "Schedule events, manage appointments, and integrate with calendar systems."
        },
        { 
            id: "fileOperation", 
            type: "fileOperation", 
            icon: FileText, 
            label: "File Ops",
            description: "Read, write, upload, download, and manipulate files and documents."
        },
    ];

    return (
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Core System Nodes - Direct access at the top */}
                <div className="px-4 pb-4 pt-4">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => onAddNode("userInput", "userInput")}
                            className="flex flex-col items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs text-blue-700 dark:text-blue-300">User Input</span>
                        </button>

                        <button
                            onClick={() => onAddNode("brokerRelay", "brokerRelay")}
                            className="flex flex-col items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                            <ArrowRightLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs text-blue-700 dark:text-blue-300">Broker Relay</span>
                        </button>
                    </div>
                </div>

                {/* Categories Section - At the top, no header, no collapsible */}
                <CategoryNodeSection
                    categories={categories}
                    onCategoryClick={handleCategoryClick}
                    columns={2}
                />

                {/* Database Functions Browser */}
                <DatabaseFunctionBrowser onAddNode={onAddNode} />

                {/* Integration Nodes */}
                <CollapsibleNodeSection
                    title="Integrations"
                    nodes={integrationNodes}
                    onAddNode={onAddNode}
                    defaultExpanded={false}
                />
            </div>

            {/* Floating Action Button */}
            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setIsOverlayOpen(true)}
                    className="w-full flex items-center justify-center gap-2 p-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transform hover:scale-[1.02]"
                >
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">Browse Nodes</span>
                </button>
            </div>

            {/* Node Selection Overlay */}
            <NodeSelectionOverlay
                title="Add Integration Node"
                nodes={integrationNodes}
                onAddNode={onAddNode}
                onClose={() => setIsOverlayOpen(false)}
                isOpen={isOverlayOpen}
            />

            {/* Category Overlays */}
            {categories.map((category) => (
                <CategoryNodeOverlay
                    key={category.id}
                    title={getCategoryTitle(category.id)}
                    categoryId={category.id}
                    nodes={getCategoryNodes(category.id)}
                    onAddNode={onAddNode}
                    onClose={closeCategoryOverlay}
                    isOpen={activeCategoryOverlay === category.id}
                />
            ))}
        </div>
    );
};

export default QuickAccessPanel;
