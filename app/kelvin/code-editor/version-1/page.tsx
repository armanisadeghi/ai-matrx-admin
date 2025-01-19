"use client"

import {Button} from '@/components/ui';
import {
    IconBrandGithub,
    IconBrandNextjs,
    IconBrandReact,
    IconBrandVue,
    IconFolderPlus,
    IconQuestionMark,
    IconReload
} from '@tabler/icons-react';
import { WorkspaceCard } from './components';
import { IWorkspace } from './types';

export default function Page() {
    const handleNewOpen = (tab: string) => {
        console.log("open", tab);
    };

    const loadRepositories = (event: React.MouseEvent): void => {
        console.log("Loading repositories...");
    };

    const dummyWorkspaces: IWorkspace[] = [
        {
            workspaceId: "nextjs-dashboard-001",
            title: "Next.js Dashboard",
            description: "Admin dashboard template with authentication",
            icon: IconBrandNextjs,
            lastUpdated: "2 hours ago",
            stars: 12
        },
        {
            workspaceId: "react-components-002",
            title: "React Component Library",
            description: "Collection of reusable UI components",
            icon: IconBrandReact,
            lastUpdated: "1 day ago",
            stars: 45
        },
        {
            workspaceId: "vue-ecommerce-003",
            title: "Vue.js E-commerce",
            description: "Online store frontend template",
            icon: IconBrandVue,
            lastUpdated: "3 days ago",
            stars: 28
        }
    ];

    const quickStartTemplates: IWorkspace[] = [
        {
            workspaceId: "template-nextjs",
            title: "Next.js Starter",
            description: "Basic Next.js 13+ template with TypeScript",
            icon: IconBrandNextjs,
            lastUpdated: "Template",
            template: true
        },
        {
            workspaceId: "template-react-vite",
            title: "React + Vite",
            description: "Modern React setup with Vite bundler",
            icon: IconBrandReact,
            lastUpdated: "Template",
            template: true
        },
        {
            workspaceId: "template-vue",
            title: "Vue 3 + TypeScript",
            description: "Vue 3 template with Composition API",
            icon: IconBrandVue,
            lastUpdated: "Template",
            template: true
        }
    ];

    return (
        <div className="max-w-12xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Code Editor 1</h1>

            {/* Welcome Banner */}
            <div className="flex justify-between items-start bg-neutral-800 p-6 rounded-lg mb-8">
                <div className="flex flex-col items-start gap-3">
                    <h3 className="text-xl font-semibold">Welcome to your new workspace!</h3>
                    <div className="flex items-center">
                        <p className="text-neutral-300">Start creating or import your projects from GitHub.</p>
                        <Button variant="ghost">
                            <IconQuestionMark size={16}/> Learn more
                        </Button>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <Button
                        onClick={() => handleNewOpen("new-project-github")}
                        variant="outline"
                    >
                        <IconBrandGithub size={16}/>
                        Import from GitHub
                    </Button>
                    <Button
                        onClick={() => handleNewOpen("new-project-blank")}
                        variant="default"
                    >
                        <IconFolderPlus size={16}/>
                        Create New
                    </Button>
                    <Button
                        onClick={loadRepositories}
                        variant="outline"
                    >
                        <IconReload size={16}/>
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Recent Workspaces */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Recent Workspaces</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {dummyWorkspaces.map((workspace) => (
                        <WorkspaceCard key={workspace.workspaceId} {...workspace} />
                    ))}
                </div>
            </div>

            {/* Quick Start Templates */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Quick Start Templates</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {quickStartTemplates.map((template) => (
                        <WorkspaceCard key={template.workspaceId} {...template} />
                    ))}
                </div>
            </div>
        </div>
    );
}