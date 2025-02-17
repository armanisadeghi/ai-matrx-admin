import {
    Building2,
    BarChart2,
    ShoppingCart,
    Users,
    Film,
    Terminal,
    Heart,
    GraduationCap,
    Briefcase,
    MessageCircle,
    Compass,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface AppletCategory {
    key: string;
    title: string;
    description: string;
    icon: LucideIcon;
    link: string;
    badges?: string[];
}





export const appletCategories: AppletCategory[] = [
    {
        key: "business-enterprise",
        title: "Business & Enterprise",
        description: "Enterprise-grade solutions for business operations, workflow automation, and organizational management",
        icon: Building2,
        link: "/applets/business-enterprise",
    },
    {
        key: "data-analytics",
        title: "Data & Analytics",
        description: "Tools for data processing, visualization, analysis, and business intelligence",
        icon: BarChart2,
        link: "/applets/data-analytics",
    },
    {
        key: "commerce-marketing",
        title: "Commerce & Marketing",
        description: "Solutions for e-commerce, digital marketing, customer engagement, and sales optimization",
        icon: ShoppingCart,
        link: "/applets/commerce-marketing",
    },
    {
        key: "social-community",
        title: "Social & Community",
        description: "Platforms for community building, social networking, and user engagement",
        icon: Users,
        link: "/applets/social-community",
    },
    {
        key: "media-entertainment",
        title: "Media & Entertainment",
        description: "Tools for content creation, streaming, media management, and entertainment services",
        icon: Film,
        link: "/applets/media-entertainment",
    },
    {
        key: "developer-tools-utilities",
        title: "Developer Tools & Utilities",
        description: "Development utilities, testing tools, and programming resources for developers",
        icon: Terminal,
        link: "/applets/developer-tools-utilities",
    },
    {
        key: "health-wellness",
        title: "Health & Wellness",
        description: "Applications for health tracking, fitness, mental wellness, and medical management",
        icon: Heart,
        link: "/applets/health-wellness",
    },
    {
        key: "education-learning",
        title: "Education & Learning",
        description: "Educational platforms, learning management systems, and knowledge sharing tools",
        icon: GraduationCap,
        link: "/applets/education-learning",
    },
    {
        key: "personal-tools-productivity",
        title: "Personal Tools & Productivity",
        description: "Personal productivity tools, task management, and organization applications",
        icon: Briefcase,
        link: "/applets/personal-tools-productivity",
    },
    {
        key: "communication-collaboration",
        title: "Communication & Collaboration",
        description: "Tools for team communication, project collaboration, and remote work",
        icon: MessageCircle,
        link: "/applets/communication-collaboration",
    },
    {
        key: "travel-lifestyle",
        title: "Travel & Lifestyle",
        description: "Applications for travel planning, lifestyle management, and personal experiences",
        icon: Compass,
        link: "/applets/travel-lifestyle",
    },
];

// Helper function to get category by key
export const getCategoryByKey = (key: string): AppletCategory | undefined => {
    return appletCategories.find((category) => category.key === key);
};

// Helper function to get all category keys
export const getAllCategoryKeys = (): string[] => {
    return appletCategories.map((category) => category.key);
};
