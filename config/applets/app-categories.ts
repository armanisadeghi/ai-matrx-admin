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
    CircleDot,
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
    {
        key: "other-miscellaneous",
        title: "Other",
        description: "Other apps that don't quite fit into a perfect category yet. Submit requests for any categories or subcategories you want added.",
        icon: CircleDot,
        link: "/applets/other-miscellaneous",
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


export const categories = [
    {
      "id": "9b61a0c5-1fc1-4534-ba76-36d459b55cb7",
      "name": "Business & Enterprise",
      "description": "Enterprise-grade solutions for business operations, workflow automation, and organizational management",
      "slug": "business-enterprise",
      "icon": "Building2",
      "created_at": "2025-02-17 03:26:03.331537+00"
    },
    {
      "id": "30f10e5b-f37f-4835-a230-fb22dbefe07f",
      "name": "Commerce & Marketing",
      "description": "Solutions for e-commerce, digital marketing, customer engagement, and sales optimization",
      "slug": "commerce-marketing",
      "icon": "ShoppingCart",
      "created_at": "2025-02-17 03:26:03.331537+00"
    },
    {
      "id": "88ffd471-4e30-4ba8-9109-0e1280de9831",
      "name": "Communication & Collaboration",
      "description": "Tools for team communication, project collaboration, and remote work",
      "slug": "communication-collaboration",
      "icon": "MessageCircle",
      "created_at": "2025-02-17 03:26:03.331537+00"
    },
    {
      "id": "e626b1b7-8e0a-4d40-88d1-a30f0be8095a",
      "name": "Data & Analytics",
      "description": "Tools for data processing, visualization, analysis, and business intelligence",
      "slug": "data-analytics",
      "icon": "BarChart2",
      "created_at": "2025-02-17 03:26:03.331537+00"
    },
    {
      "id": "2eb80fd0-294c-4995-b867-48a371a9690d",
      "name": "Developer Tools & Utilities",
      "description": "Development utilities, testing tools, and programming resources for developers",
      "slug": "developer-tools-utilities",
      "icon": "Terminal",
      "created_at": "2025-02-17 03:26:03.331537+00"
    },
    {
      "id": "5bbe32ce-3973-4833-8349-6fa8dbf55b36",
      "name": "Education & Learning",
      "description": "Educational platforms, learning management systems, and knowledge sharing tools",
      "slug": "education-learning",
      "icon": "GraduationCap",
      "created_at": "2025-02-17 03:26:03.331537+00"
    },
    {
      "id": "d6743a26-0d38-44b1-aa5c-cfa40b719e88",
      "name": "Health & Wellness",
      "description": "Applications for health tracking, fitness, mental wellness, and medical management",
      "slug": "health-wellness",
      "icon": "Heart",
      "created_at": "2025-02-17 03:26:03.331537+00"
    },
    {
      "id": "5c10b53a-3682-43f8-aa74-034ad08b16cb",
      "name": "Media & Entertainment",
      "description": "Tools for content creation, streaming, media management, and entertainment services",
      "slug": "media-entertainment",
      "icon": "Film",
      "created_at": "2025-02-17 03:26:03.331537+00"
    },
    {
      "id": "22f8237e-023d-416b-8220-ddb158c3fc67",
      "name": "Other Miscellaneous",
      "description": "Other apps that don't quite fit into a perfect category yet. Submit requests for any categories or subcategories you want added.",
      "slug": "other-miscellaneous",
      "icon": "CircleDot",
      "created_at": "2025-02-17 03:40:15.711077+00"
    },
    {
      "id": "eb8b7fa6-484f-48e9-b403-3230e37b17b2",
      "name": "Personal Tools & Productivity",
      "description": "Personal productivity tools, task management, and organization applications",
      "slug": "personal-tools-productivity",
      "icon": "Briefcase",
      "created_at": "2025-02-17 03:26:03.331537+00"
    },
    {
      "id": "6ab2fc80-1495-449d-b6b1-3f71733e9154",
      "name": "Social & Community",
      "description": "Platforms for community building, social networking, and user engagement",
      "slug": "social-community",
      "icon": "Users",
      "created_at": "2025-02-17 03:26:03.331537+00"
    },
    {
      "id": "2df7ca8f-8c26-4414-8b81-af75da52709d",
      "name": "Travel & Lifestyle",
      "description": "Applications for travel planning, lifestyle management, and personal experiences",
      "slug": "travel-lifestyle",
      "icon": "Compass",
      "created_at": "2025-02-17 03:26:03.331537+00"
    }
  ]
  

export const subCategories = [
    {
      "id": "e0553600-4162-49b9-bf19-90254363a31f",
      "category_id": "2eb80fd0-294c-4995-b867-48a371a9690d",
      "name": "API Development",
      "description": "Tools for building and testing APIs",
      "slug": "api-development",
      "icon": "Webhook",
      "features": [
        "API design",
        "Documentation generation",
        "Request testing",
        "Authentication handling",
        "Performance monitoring"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "7d3e1810-a1e5-4e2b-be04-690ba165e3f8",
      "category_id": "2df7ca8f-8c26-4414-8b81-af75da52709d",
      "name": "Accommodation Management",
      "description": "Tools for managing accommodation bookings and stays",
      "slug": "accommodation-management",
      "icon": "Hotel",
      "features": [
        "Booking management",
        "Property information",
        "Stay organization",
        "Review system",
        "Payment handling"
      ],
      "created_at": "2025-02-17 03:51:35.439994+00"
    },
    {
      "id": "8b3671dd-33df-433b-9843-4d4984139a3f",
      "category_id": "30f10e5b-f37f-4835-a230-fb22dbefe07f",
      "name": "Advertising Tools",
      "description": "Tools for managing and optimizing advertising campaigns",
      "slug": "advertising-tools",
      "icon": "Megaphone",
      "features": [
        "Ad campaign management",
        "Budget optimization",
        "Ad performance tracking",
        "Audience targeting",
        "A/B testing"
      ],
      "created_at": "2025-02-17 03:50:21.569205+00"
    },
    {
      "id": "9400a716-8a39-4472-9db2-6e6e2c8f437f",
      "category_id": "e626b1b7-8e0a-4d40-88d1-a30f0be8095a",
      "name": "Analytics Dashboards",
      "description": "Interactive dashboards for data visualization and analysis",
      "slug": "analytics-dashboards",
      "icon": "LayoutDashboard",
      "features": [
        "Real-time analytics",
        "Custom dashboards",
        "Data monitoring",
        "Performance metrics",
        "Interactive filters"
      ],
      "created_at": "2025-02-17 03:49:40.482594+00"
    },
    {
      "id": "43a1c196-e619-4195-957b-e37a4b36e692",
      "category_id": "2df7ca8f-8c26-4414-8b81-af75da52709d",
      "name": "Booking Systems",
      "description": "Solutions for travel and accommodation bookings",
      "slug": "booking-systems",
      "icon": "CalendarRange",
      "features": [
        "Reservation management",
        "Availability checking",
        "Payment processing",
        "Booking confirmation",
        "Cancellation handling"
      ],
      "created_at": "2025-02-17 03:51:35.439994+00"
    },
    {
      "id": "0c243131-39b7-40c4-aad4-5ccf5d520e87",
      "category_id": "e626b1b7-8e0a-4d40-88d1-a30f0be8095a",
      "name": "Business Intelligence",
      "description": "Advanced analytics tools for business insight and decision making",
      "slug": "data-analytics-bi",
      "icon": "PieChart",
      "features": [
        "Data analysis",
        "Report generation",
        "KPI tracking",
        "Trend analysis",
        "Predictive modeling"
      ],
      "created_at": "2025-02-17 03:49:40.482594+00"
    },
    {
      "id": "ac64bdc5-9ec3-4127-be01-4ea3d759ec1b",
      "category_id": "9b61a0c5-1fc1-4534-ba76-36d459b55cb7",
      "name": "Business Intelligence",
      "description": "Tools for data-driven business insights and decision making",
      "slug": "business-intelligence",
      "icon": "PieChart",
      "features": [
        "Data analysis",
        "Performance metrics",
        "Business reporting",
        "Trend analysis",
        "Decision support"
      ],
      "created_at": "2025-02-17 03:47:44.801178+00"
    },
    {
      "id": "4459aca8-6d90-4809-9065-84fa48da4ca0",
      "category_id": "9b61a0c5-1fc1-4534-ba76-36d459b55cb7",
      "name": "Business Process Automation",
      "description": "Solutions for automating repetitive business tasks and workflows",
      "slug": "business-process-automation",
      "icon": "Workflow",
      "features": [
        "Workflow automation",
        "Process mapping",
        "Task automation",
        "Integration tools",
        "Performance monitoring"
      ],
      "created_at": "2025-02-17 03:49:40.482594+00"
    },
    {
      "id": "93c432e7-03da-4d5a-808e-dcb1fbac149d",
      "category_id": "9b61a0c5-1fc1-4534-ba76-36d459b55cb7",
      "name": "CRM",
      "description": "Customer relationship management solutions for business growth",
      "slug": "crm",
      "icon": "UserSquare2",
      "features": [
        "Contact management",
        "Lead tracking",
        "Sales pipeline",
        "Customer support",
        "Relationship analytics"
      ],
      "created_at": "2025-02-17 03:47:44.801178+00"
    },
    {
      "id": "092ef14f-bcb2-4e48-af94-820537e553c0",
      "category_id": "2eb80fd0-294c-4995-b867-48a371a9690d",
      "name": "Code Generation",
      "description": "Tools for automated code generation and scaffolding",
      "slug": "code-generation",
      "icon": "Zap",
      "features": [
        "Template generation",
        "Boilerplate creation",
        "Code scaffolding",
        "API client generation",
        "Database schema generation"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "a69c1efa-0ba2-4ef0-9fd1-79939aee918d",
      "category_id": "6ab2fc80-1495-449d-b6b1-3f71733e9154",
      "name": "Community Management",
      "description": "Tools for managing online communities and user engagement",
      "slug": "community-management",
      "icon": "Users",
      "features": [
        "Member management",
        "Community engagement",
        "Content moderation",
        "Analytics tracking",
        "Community insights"
      ],
      "created_at": "2025-02-17 03:50:21.569205+00"
    },
    {
      "id": "eba9b86e-5380-460e-b365-eb68d32f9db3",
      "category_id": "5bbe32ce-3973-4833-8349-6fa8dbf55b36",
      "name": "Course Creation",
      "description": "Tools for developing and structuring educational content",
      "slug": "course-creation",
      "icon": "PenTool",
      "features": [
        "Content authoring",
        "Curriculum design",
        "Assessment creation",
        "Media integration",
        "Course templates"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "fac597bc-0384-422e-8303-fa95802af521",
      "category_id": "22f8237e-023d-416b-8220-ddb158c3fc67",
      "name": "Cross-category Applications",
      "description": "Applications spanning multiple categories",
      "slug": "cross-category-applications",
      "icon": "AppleIcon",
      "features": [
        "Multi-category use",
        "Cross-functional",
        "Versatile applications",
        "Integrated solutions",
        "Broad compatibility"
      ],
      "created_at": "2025-02-17 03:52:25.277742+00"
    },
    {
      "id": "a12daf85-0eec-421f-98d7-ef596406c609",
      "category_id": "30f10e5b-f37f-4835-a230-fb22dbefe07f",
      "name": "Customer Engagement",
      "description": "Tools for managing and improving customer interactions",
      "slug": "customer-engagement",
      "icon": "UserPlus",
      "features": [
        "Customer feedback",
        "Loyalty programs",
        "Engagement tracking",
        "Customer support",
        "Personalization"
      ],
      "created_at": "2025-02-17 03:50:21.569205+00"
    },
    {
      "id": "38529b73-e1da-4f30-89a2-d7cfb5e54cb2",
      "category_id": "e626b1b7-8e0a-4d40-88d1-a30f0be8095a",
      "name": "Data Integration",
      "description": "Tools for combining and managing data from multiple sources",
      "slug": "data-integration",
      "icon": "GitCompare",
      "features": [
        "Data connectors",
        "Integration pipelines",
        "Data mapping",
        "Source management",
        "Data synchronization"
      ],
      "created_at": "2025-02-17 03:49:40.482594+00"
    },
    {
      "id": "45d59a61-934e-430f-8698-a7b8ad627a66",
      "category_id": "e626b1b7-8e0a-4d40-88d1-a30f0be8095a",
      "name": "Data Processing",
      "description": "Tools for processing, cleaning, and transforming data",
      "slug": "data-processing",
      "icon": "ServerCog",
      "features": [
        "Data cleaning",
        "Data transformation",
        "ETL processes",
        "Data validation",
        "Batch processing"
      ],
      "created_at": "2025-02-17 03:49:40.482594+00"
    },
    {
      "id": "f5659e0e-03bb-4923-b6a6-3b8f0c5e8100",
      "category_id": "e626b1b7-8e0a-4d40-88d1-a30f0be8095a",
      "name": "Data Visualization",
      "description": "Tools for creating visual representations of data and insights",
      "slug": "data-visualization",
      "icon": "BarChart",
      "features": [
        "Chart creation",
        "Interactive dashboards",
        "Data plotting",
        "Visual analytics",
        "Custom visualizations"
      ],
      "created_at": "2025-02-17 03:49:40.482594+00"
    },
    {
      "id": "54cafa56-f454-463a-af98-4e730afeef09",
      "category_id": "2eb80fd0-294c-4995-b867-48a371a9690d",
      "name": "Debugging Tools",
      "description": "Solutions for identifying and fixing software issues",
      "slug": "debugging-tools",
      "icon": "Bug",
      "features": [
        "Error tracking",
        "Log analysis",
        "Breakpoint management",
        "Variable inspection",
        "Memory profiling"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "00312482-179f-46cc-b8c8-faad376c1f85",
      "category_id": "2eb80fd0-294c-4995-b867-48a371a9690d",
      "name": "DevOps Tools",
      "description": "Tools for DevOps practices and infrastructure management",
      "slug": "devops-tools",
      "icon": "Container",
      "features": [
        "Infrastructure as code",
        "Container management",
        "Configuration management",
        "Monitoring and logging",
        "Deployment automation"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "e10451a9-334e-4377-ad55-449bbfe11424",
      "category_id": "2eb80fd0-294c-4995-b867-48a371a9690d",
      "name": "Development Workflows",
      "description": "Solutions for managing development processes and workflows",
      "slug": "development-workflows",
      "icon": "Workflow",
      "features": [
        "CI/CD pipelines",
        "Build automation",
        "Deployment management",
        "Environment configuration",
        "Task automation"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "f90b6102-62a4-4f2c-bded-4ee01c0bccfa",
      "category_id": "30f10e5b-f37f-4835-a230-fb22dbefe07f",
      "name": "Digital Marketing",
      "description": "Tools for planning and executing digital marketing campaigns",
      "slug": "digital-marketing",
      "icon": "Target",
      "features": [
        "Campaign management",
        "Marketing automation",
        "Lead generation",
        "Content marketing",
        "Performance tracking"
      ],
      "created_at": "2025-02-17 03:49:40.482594+00"
    },
    {
      "id": "76e4ccd4-7163-4d5e-95f4-abf1b6c7d8fb",
      "category_id": "88ffd471-4e30-4ba8-9109-0e1280de9831",
      "name": "Document Collaboration",
      "description": "Solutions for collaborative document editing",
      "slug": "document-collaboration",
      "icon": "FileText",
      "features": [
        "Real-time editing",
        "Version control",
        "Comment system",
        "Access management",
        "Change tracking"
      ],
      "created_at": "2025-02-17 03:51:35.439994+00"
    },
    {
      "id": "a64bfc59-ad9b-4866-954a-b42cde313d57",
      "category_id": "9b61a0c5-1fc1-4534-ba76-36d459b55cb7",
      "name": "Document Management",
      "description": "Systems for organizing, storing, and managing business documents",
      "slug": "document-management",
      "icon": "Files",
      "features": [
        "File organization",
        "Version control",
        "Document sharing",
        "Access control",
        "Document workflow"
      ],
      "created_at": "2025-02-17 03:47:44.801178+00"
    },
    {
      "id": "9d045f31-86bc-44a1-ac71-20dc874f03e4",
      "category_id": "2eb80fd0-294c-4995-b867-48a371a9690d",
      "name": "Documentation Tools",
      "description": "Solutions for creating and managing technical documentation",
      "slug": "documentation-tools",
      "icon": "FileCode",
      "features": [
        "Documentation generation",
        "API documentation",
        "Version control",
        "Search functionality",
        "Collaboration tools"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "f0c61d48-2919-45f2-bf41-4ec3e47900d8",
      "category_id": "30f10e5b-f37f-4835-a230-fb22dbefe07f",
      "name": "E-commerce Platforms",
      "description": "Complete solutions for online store management and e-commerce operations",
      "slug": "ecommerce-platforms",
      "icon": "Store",
      "features": [
        "Product management",
        "Shopping cart",
        "Payment processing",
        "Inventory management",
        "Order fulfillment"
      ],
      "created_at": "2025-02-17 03:49:40.482594+00"
    },
    {
      "id": "456e5ed2-aa1f-4585-844e-0d417b8cb955",
      "category_id": "88ffd471-4e30-4ba8-9109-0e1280de9831",
      "name": "Email & Messaging",
      "description": "Platforms for email and message management",
      "slug": "email-messaging",
      "icon": "Mail",
      "features": [
        "Email management",
        "Message organization",
        "Contact management",
        "Template system",
        "Integration options"
      ],
      "created_at": "2025-02-17 03:51:35.439994+00"
    },
    {
      "id": "9e1e9229-123a-40d6-8566-458142128db2",
      "category_id": "30f10e5b-f37f-4835-a230-fb22dbefe07f",
      "name": "Email Marketing",
      "description": "Solutions for email campaign management and automation",
      "slug": "email-marketing",
      "icon": "Mail",
      "features": [
        "Email campaigns",
        "Newsletter management",
        "Template design",
        "Audience segmentation",
        "Analytics tracking"
      ],
      "created_at": "2025-02-17 03:50:21.569205+00"
    },
    {
      "id": "7700d16a-3a31-45fc-9a31-e6950719fb2f",
      "category_id": "22f8237e-023d-416b-8220-ddb158c3fc67",
      "name": "Emerging Technologies",
      "description": "Applications leveraging cutting-edge technologies",
      "slug": "emerging-technologies",
      "icon": "Lightbulb",
      "features": [
        "New technologies",
        "Innovation focus",
        "Modern solutions",
        "Technology testing",
        "Future-ready"
      ],
      "created_at": "2025-02-17 03:52:25.277742+00"
    },
    {
      "id": "5497951e-e5fe-4300-88af-b1b7f8408540",
      "category_id": "2df7ca8f-8c26-4414-8b81-af75da52709d",
      "name": "Experience Planning",
      "description": "Solutions for planning and organizing experiences",
      "slug": "experience-planning",
      "icon": "Target",
      "features": [
        "Activity booking",
        "Experience curation",
        "Itinerary planning",
        "Review management",
        "Recommendation engine"
      ],
      "created_at": "2025-02-17 03:51:35.439994+00"
    },
    {
      "id": "67a9742b-4472-4ccd-bbe8-04015b3b6aac",
      "category_id": "22f8237e-023d-416b-8220-ddb158c3fc67",
      "name": "Experimental",
      "description": "Innovative and experimental applications",
      "slug": "experimental",
      "icon": "FlaskConical",
      "features": [
        "Innovation testing",
        "New technologies",
        "Prototype features",
        "Experimental UI",
        "Beta testing"
      ],
      "created_at": "2025-02-17 03:52:25.277742+00"
    },
    {
      "id": "9722c18f-5886-442c-adf3-e021c31dc4d9",
      "category_id": "88ffd471-4e30-4ba8-9109-0e1280de9831",
      "name": "File Sharing",
      "description": "Tools for sharing and managing team files",
      "slug": "file-sharing",
      "icon": "Share",
      "features": [
        "File upload",
        "Access control",
        "Version control",
        "Collaboration tools",
        "Storage management"
      ],
      "created_at": "2025-02-17 03:51:35.439994+00"
    },
    {
      "id": "13399f7d-b516-4eea-9782-0797624b614f",
      "category_id": "d6743a26-0d38-44b1-aa5c-cfa40b719e88",
      "name": "Fitness Tracking",
      "description": "Tools for tracking physical activity and fitness progress",
      "slug": "fitness-tracking",
      "icon": "Activity",
      "features": [
        "Activity monitoring",
        "Workout planning",
        "Progress tracking",
        "Goal setting",
        "Performance analytics"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "36e106e6-bc81-4929-9aea-4989e14474b9",
      "category_id": "9b61a0c5-1fc1-4534-ba76-36d459b55cb7",
      "name": "HR & Recruitment",
      "description": "Solutions for human resources management and talent acquisition",
      "slug": "hr-recruitment",
      "icon": "UserCog",
      "features": [
        "Recruitment tracking",
        "Employee management",
        "Performance review",
        "Training management",
        "HR analytics"
      ],
      "created_at": "2025-02-17 03:47:44.801178+00"
    },
    {
      "id": "e0e54904-c9c1-4fe1-9707-ecaf3fcf5381",
      "category_id": "eb8b7fa6-484f-48e9-b403-3230e37b17b2",
      "name": "Habit Tracking",
      "description": "Solutions for developing and monitoring personal habits",
      "slug": "habit-tracking",
      "icon": "ListTodo",
      "features": [
        "Habit monitoring",
        "Streak tracking",
        "Progress analysis",
        "Reminder system",
        "Performance insights"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "712037cb-58da-4988-9a16-cb34b6ef5d9b",
      "category_id": "d6743a26-0d38-44b1-aa5c-cfa40b719e88",
      "name": "Health Monitoring",
      "description": "Solutions for monitoring health metrics and vital signs",
      "slug": "health-monitoring",
      "icon": "Heart",
      "features": [
        "Vital sign tracking",
        "Health metrics",
        "Sleep monitoring",
        "Symptom tracking",
        "Health analytics"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "139d5ecd-685f-4281-9969-8e6dc3e2fa97",
      "category_id": "d6743a26-0d38-44b1-aa5c-cfa40b719e88",
      "name": "Healthcare Management",
      "description": "Solutions for managing healthcare and medical needs",
      "slug": "healthcare-management",
      "icon": "Hospital",
      "features": [
        "Appointment scheduling",
        "Medication tracking",
        "Provider management",
        "Health records",
        "Treatment planning"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "35613235-12d5-45b7-bb08-fb8d2bce1586",
      "category_id": "5bbe32ce-3973-4833-8349-6fa8dbf55b36",
      "name": "Learning Management",
      "description": "Comprehensive systems for managing educational programs and courses",
      "slug": "learning-management",
      "icon": "BookOpen",
      "features": [
        "Course management",
        "Student tracking",
        "Progress monitoring",
        "Resource management",
        "Learning analytics"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "b0f857d8-fbad-4569-88b6-aede7cde85ce",
      "category_id": "eb8b7fa6-484f-48e9-b403-3230e37b17b2",
      "name": "Life Planning",
      "description": "Tools for long-term personal planning and development",
      "slug": "life-planning",
      "icon": "Compass",
      "features": [
        "Life goals",
        "Career planning",
        "Personal development",
        "Progress tracking",
        "Action planning"
      ],
      "created_at": "2025-02-17 03:51:35.439994+00"
    },
    {
      "id": "134f7b9d-be9f-4ab9-a83d-2c321383a007",
      "category_id": "2df7ca8f-8c26-4414-8b81-af75da52709d",
      "name": "Lifestyle Management",
      "description": "Tools for managing personal lifestyle and activities",
      "slug": "lifestyle-management",
      "icon": "Sparkles",
      "features": [
        "Activity planning",
        "Lifestyle tracking",
        "Preference management",
        "Experience curation",
        "Personal scheduling"
      ],
      "created_at": "2025-02-17 03:51:35.439994+00"
    },
    {
      "id": "ddf2fcbb-efb4-4321-834f-6680e1dda85c",
      "category_id": "2df7ca8f-8c26-4414-8b81-af75da52709d",
      "name": "Local Discovery",
      "description": "Solutions for discovering local attractions and activities",
      "slug": "local-discovery",
      "icon": "Compass",
      "features": [
        "Local exploration",
        "Activity discovery",
        "Event finding",
        "Local recommendations",
        "Cultural experiences"
      ],
      "created_at": "2025-02-17 03:52:25.277742+00"
    },
    {
      "id": "30bf5058-f0d9-401e-a9a8-a36e1513f2f5",
      "category_id": "2df7ca8f-8c26-4414-8b81-af75da52709d",
      "name": "Location Services",
      "description": "Solutions for location-based information and navigation",
      "slug": "location-services",
      "icon": "MapPin",
      "features": [
        "Location tracking",
        "Navigation tools",
        "Point of interest",
        "Local information",
        "Map integration"
      ],
      "created_at": "2025-02-17 03:51:35.439994+00"
    },
    {
      "id": "4a119972-1673-4e0c-8600-fb8b28a65a8e",
      "category_id": "e626b1b7-8e0a-4d40-88d1-a30f0be8095a",
      "name": "Machine Learning Tools",
      "description": "Solutions for implementing and managing machine learning models",
      "slug": "machine-learning-tools",
      "icon": "Brain",
      "features": [
        "Model training",
        "Prediction tools",
        "Algorithm selection",
        "Model deployment",
        "Performance monitoring"
      ],
      "created_at": "2025-02-17 03:49:40.482594+00"
    },
    {
      "id": "6e1bb02c-5002-44a2-8bdc-b5b63d9aee17",
      "category_id": "30f10e5b-f37f-4835-a230-fb22dbefe07f",
      "name": "Marketing Analytics",
      "description": "Solutions for analyzing and optimizing marketing performance",
      "slug": "marketing-analytics",
      "icon": "Activity",
      "features": [
        "Performance metrics",
        "ROI tracking",
        "Campaign analytics",
        "Conversion tracking",
        "Customer insights"
      ],
      "created_at": "2025-02-17 03:50:21.569205+00"
    },
    {
      "id": "728e802e-cb23-446c-aea6-36eb0ef8038a",
      "category_id": "30f10e5b-f37f-4835-a230-fb22dbefe07f",
      "name": "Marketplace Management",
      "description": "Solutions for managing online marketplace operations",
      "slug": "marketplace-management",
      "icon": "Store",
      "features": [
        "Vendor management",
        "Product listings",
        "Order processing",
        "Marketplace analytics",
        "Commission tracking"
      ],
      "created_at": "2025-02-17 03:50:21.569205+00"
    },
    {
      "id": "f67f3149-72f5-4ff4-9e2a-a8e97141ec3d",
      "category_id": "d6743a26-0d38-44b1-aa5c-cfa40b719e88",
      "name": "Medical Records",
      "description": "Tools for managing personal medical records and history",
      "slug": "medical-records",
      "icon": "ClipboardList",
      "features": [
        "Record management",
        "Document storage",
        "History tracking",
        "Provider sharing",
        "Security controls"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "01445f78-8c43-49e3-85d8-9124836638d3",
      "category_id": "d6743a26-0d38-44b1-aa5c-cfa40b719e88",
      "name": "Meditation & Mindfulness",
      "description": "Solutions for meditation and mindfulness practices",
      "slug": "meditation-mindfulness",
      "icon": "Flower2",
      "features": [
        "Guided meditation",
        "Breathing exercises",
        "Progress tracking",
        "Session planning",
        "Mindfulness exercises"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "cda64272-607b-40b8-bc44-da23a8d99fd8",
      "category_id": "88ffd471-4e30-4ba8-9109-0e1280de9831",
      "name": "Meeting Management",
      "description": "Tools for organizing and managing team meetings",
      "slug": "meeting-management",
      "icon": "CalendarCheck",
      "features": [
        "Meeting scheduling",
        "Agenda management",
        "Note taking",
        "Action items",
        "Follow-up tracking"
      ],
      "created_at": "2025-02-17 03:51:35.439994+00"
    },
    {
      "id": "724bc266-9772-4293-a3ea-39a9c5bb43c8",
      "category_id": "d6743a26-0d38-44b1-aa5c-cfa40b719e88",
      "name": "Mental Health",
      "description": "Tools for mental health support and management",
      "slug": "mental-health",
      "icon": "Brain",
      "features": [
        "Mood tracking",
        "Therapy support",
        "Stress management",
        "Progress monitoring",
        "Resource library"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "7b96e23f-a8ee-4844-b26b-d2c3476947b5",
      "category_id": "22f8237e-023d-416b-8220-ddb158c3fc67",
      "name": "Multi-purpose",
      "description": "Versatile tools serving multiple functions",
      "slug": "multi-purpose",
      "icon": "Shapes",
      "features": [
        "Multiple functions",
        "Flexible usage",
        "Customization options",
        "Integration capabilities",
        "Adaptable features"
      ],
      "created_at": "2025-02-17 03:52:25.277742+00"
    },
    {
      "id": "16142dba-8417-4775-92d3-ab57ee1c6bab",
      "category_id": "d6743a26-0d38-44b1-aa5c-cfa40b719e88",
      "name": "Nutrition Planning",
      "description": "Tools for meal planning and nutrition tracking",
      "slug": "nutrition-planning",
      "icon": "Utensils",
      "features": [
        "Meal planning",
        "Nutritional tracking",
        "Recipe management",
        "Diet analysis",
        "Goal setting"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "d9df888c-3d66-4249-acf7-2aa3542dfd0e",
      "category_id": "9b61a0c5-1fc1-4534-ba76-36d459b55cb7",
      "name": "Operations Management",
      "description": "Tools for managing and optimizing business operations",
      "slug": "operations-management",
      "icon": "Settings2",
      "features": [
        "Process optimization",
        "Operations tracking",
        "Quality management",
        "Supply chain",
        "Inventory control"
      ],
      "created_at": "2025-02-17 03:49:40.482594+00"
    },
    {
      "id": "740e2d6b-883f-4e1e-ae12-cef6626ca271",
      "category_id": "2eb80fd0-294c-4995-b867-48a371a9690d",
      "name": "Performance Monitoring",
      "description": "Solutions for monitoring application performance",
      "slug": "performance-monitoring",
      "icon": "Gauge",
      "features": [
        "Resource monitoring",
        "Performance metrics",
        "Error tracking",
        "Real-time analytics",
        "Alert management"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "f42f53c1-a9bd-469d-89b6-f5b1b75b3795",
      "category_id": "eb8b7fa6-484f-48e9-b403-3230e37b17b2",
      "name": "Personal Finance",
      "description": "Solutions for managing personal finances and budgets",
      "slug": "personal-finance",
      "icon": "Wallet",
      "features": [
        "Budget tracking",
        "Expense management",
        "Financial planning",
        "Investment tracking",
        "Report generation"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "51dd1433-577a-4450-9408-6b7f004fc55c",
      "category_id": "e626b1b7-8e0a-4d40-88d1-a30f0be8095a",
      "name": "Predictive Analytics",
      "description": "Solutions for forecasting and predictive modeling",
      "slug": "predictive-analytics",
      "icon": "TrendingUp",
      "features": [
        "Forecasting",
        "Trend analysis",
        "Predictive modeling",
        "Risk assessment",
        "Pattern recognition"
      ],
      "created_at": "2025-02-17 03:49:40.482594+00"
    },
    {
      "id": "ac0709d2-a436-40d1-8f4a-8c430c711f81",
      "category_id": "88ffd471-4e30-4ba8-9109-0e1280de9831",
      "name": "Project Collaboration",
      "description": "Platforms for team project coordination",
      "slug": "project-collaboration",
      "icon": "Users",
      "features": [
        "Task management",
        "Team coordination",
        "Resource sharing",
        "Progress tracking",
        "Timeline management"
      ],
      "created_at": "2025-02-17 03:51:35.439994+00"
    },
    {
      "id": "e9b45cef-0b54-4d00-a71b-24ab14aa4e97",
      "category_id": "9b61a0c5-1fc1-4534-ba76-36d459b55cb7",
      "name": "Project Management",
      "description": "Comprehensive tools for project planning, tracking, and delivery",
      "slug": "project-management",
      "icon": "ClipboardCheck",
      "features": [
        "Task management",
        "Timeline planning",
        "Resource allocation",
        "Project tracking",
        "Team collaboration"
      ],
      "created_at": "2025-02-17 03:47:44.801178+00"
    },
    {
      "id": "18696131-7bc2-468c-959f-c377e3d0b65f",
      "category_id": "88ffd471-4e30-4ba8-9109-0e1280de9831",
      "name": "Remote Work Tools",
      "description": "Solutions for facilitating remote work",
      "slug": "remote-work-tools",
      "icon": "Laptop",
      "features": [
        "Virtual workspace",
        "Remote access",
        "Collaboration tools",
        "Time zone management",
        "Team coordination"
      ],
      "created_at": "2025-02-17 03:51:35.439994+00"
    },
    {
      "id": "bc97f910-46f4-4d88-b383-df4289b0d686",
      "category_id": "e626b1b7-8e0a-4d40-88d1-a30f0be8095a",
      "name": "Reporting Tools",
      "description": "Solutions for creating and managing data reports and analytics",
      "slug": "reporting-tools",
      "icon": "FileSpreadsheet",
      "features": [
        "Report generation",
        "Data export",
        "Custom reporting",
        "Automated reports",
        "Report scheduling"
      ],
      "created_at": "2025-02-17 03:49:40.482594+00"
    },
    {
      "id": "776a7170-3857-4dd3-8a60-8c18791ff438",
      "category_id": "9b61a0c5-1fc1-4534-ba76-36d459b55cb7",
      "name": "Resource Planning",
      "description": "Tools for managing and optimizing organizational resources",
      "slug": "resource-planning",
      "icon": "CalendarRange",
      "features": [
        "Resource allocation",
        "Capacity planning",
        "Budget management",
        "Asset tracking",
        "Resource optimization"
      ],
      "created_at": "2025-02-17 03:47:44.801178+00"
    },
    {
      "id": "c39dea72-6c67-4c69-b2c2-2b8c83bead30",
      "category_id": "30f10e5b-f37f-4835-a230-fb22dbefe07f",
      "name": "SEO Tools",
      "description": "Tools for improving search engine visibility and ranking",
      "slug": "seo-tools",
      "icon": "Search",
      "features": [
        "Keyword research",
        "SEO analysis",
        "Rank tracking",
        "Content optimization",
        "Backlink management"
      ],
      "created_at": "2025-02-17 03:50:21.569205+00"
    },
    {
      "id": "320f0e2b-9f0c-437b-a36c-bfff47552c95",
      "category_id": "30f10e5b-f37f-4835-a230-fb22dbefe07f",
      "name": "Sales Management",
      "description": "Solutions for managing and optimizing sales processes",
      "slug": "sales-management",
      "icon": "TrendingUp",
      "features": [
        "Sales pipeline",
        "Lead management",
        "Sales analytics",
        "Quote management",
        "Sales forecasting"
      ],
      "created_at": "2025-02-17 03:50:21.569205+00"
    },
    {
      "id": "736d38c6-574c-43d9-9c61-26ed8149ec42",
      "category_id": "30f10e5b-f37f-4835-a230-fb22dbefe07f",
      "name": "Social Media Marketing",
      "description": "Tools for managing and optimizing social media marketing efforts",
      "slug": "social-media-marketing",
      "icon": "Share2",
      "features": [
        "Content scheduling",
        "Social analytics",
        "Engagement tracking",
        "Campaign management",
        "Cross-platform posting"
      ],
      "created_at": "2025-02-17 03:50:21.569205+00"
    },
    {
      "id": "662b33b1-e7a6-4a97-a970-02d87098c139",
      "category_id": "6ab2fc80-1495-449d-b6b1-3f71733e9154",
      "name": "Social Networks",
      "description": "Platforms for building and managing social networking communities",
      "slug": "social-networks",
      "icon": "Network",
      "features": [
        "User profiles",
        "Social connections",
        "Activity feeds",
        "Privacy controls",
        "Content sharing"
      ],
      "created_at": "2025-02-17 03:50:21.569205+00"
    },
    {
      "id": "49de79db-a283-45e3-b498-5a8eb202591f",
      "category_id": "22f8237e-023d-416b-8220-ddb158c3fc67",
      "name": "Specialized Tools",
      "description": "Tools designed for specific specialized needs",
      "slug": "specialized-tools",
      "icon": "Wrench",
      "features": [
        "Specialized functions",
        "Focused solutions",
        "Expert tools",
        "Professional features",
        "Industry-specific"
      ],
      "created_at": "2025-02-17 03:52:25.277742+00"
    },
    {
      "id": "98309b18-d5e3-484a-8751-0ca2324c16a0",
      "category_id": "e626b1b7-8e0a-4d40-88d1-a30f0be8095a",
      "name": "Statistical Analysis",
      "description": "Tools for performing statistical analysis on data sets",
      "slug": "statistical-analysis",
      "icon": "LineChart",
      "features": [
        "Statistical testing",
        "Data correlation",
        "Regression analysis",
        "Descriptive statistics",
        "Statistical modeling"
      ],
      "created_at": "2025-02-17 03:49:40.482594+00"
    },
    {
      "id": "783407b0-3a8f-4ecc-a4e5-2d071abc655b",
      "category_id": "eb8b7fa6-484f-48e9-b403-3230e37b17b2",
      "name": "Task Management",
      "description": "Tools for organizing and tracking personal tasks",
      "slug": "task-management",
      "icon": "CheckSquare",
      "features": [
        "Task organization",
        "Priority setting",
        "Progress tracking",
        "Deadline management",
        "Task collaboration"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "65b76114-7011-4471-ac87-256c4d65cd9d",
      "category_id": "88ffd471-4e30-4ba8-9109-0e1280de9831",
      "name": "Team Chat",
      "description": "Platforms for team communication and messaging",
      "slug": "team-chat",
      "icon": "MessageCircle",
      "features": [
        "Real-time messaging",
        "Channel management",
        "File sharing",
        "Integration options",
        "Search functionality"
      ],
      "created_at": "2025-02-17 03:51:35.439994+00"
    },
    {
      "id": "f5a6f65d-7426-4892-83d7-fa05a8637bff",
      "category_id": "88ffd471-4e30-4ba8-9109-0e1280de9831",
      "name": "Team Coordination",
      "description": "Tools for coordinating team activities and workflows",
      "slug": "team-coordination",
      "icon": "UsersRound",
      "features": [
        "Task assignment",
        "Schedule management",
        "Resource allocation",
        "Progress tracking",
        "Team communication"
      ],
      "created_at": "2025-02-17 03:51:35.439994+00"
    },
    {
      "id": "c9811bf9-74de-4901-8a71-f924b4a3b03c",
      "category_id": "9b61a0c5-1fc1-4534-ba76-36d459b55cb7",
      "name": "Team Management",
      "description": "Solutions for team coordination, performance tracking, and collaboration",
      "slug": "team-management",
      "icon": "Users",
      "features": [
        "Team coordination",
        "Performance tracking",
        "Work scheduling",
        "Team communications",
        "Role management"
      ],
      "created_at": "2025-02-17 03:47:44.801178+00"
    },
    {
      "id": "3eb82e02-dfc8-46ad-8dc5-2e6c0c543a38",
      "category_id": "d6743a26-0d38-44b1-aa5c-cfa40b719e88",
      "name": "Telemedicine",
      "description": "Solutions for remote healthcare and medical consultations",
      "slug": "telemedicine",
      "icon": "Video",
      "features": [
        "Virtual consultations",
        "Appointment scheduling",
        "Medical chat",
        "Prescription management",
        "Health records access"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "8562cb33-e7e2-4502-bdbf-995fd0200c56",
      "category_id": "eb8b7fa6-484f-48e9-b403-3230e37b17b2",
      "name": "Time Tracking",
      "description": "Solutions for monitoring and managing time usage",
      "slug": "time-tracking",
      "icon": "Clock",
      "features": [
        "Time logging",
        "Activity tracking",
        "Productivity analysis",
        "Report generation",
        "Project timing"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "ec4d9091-a607-4fb6-b516-258d9b4d49cc",
      "category_id": "2df7ca8f-8c26-4414-8b81-af75da52709d",
      "name": "Travel Guides",
      "description": "Digital guides and resources for travelers",
      "slug": "travel-guides",
      "icon": "MapIcon",
      "features": [
        "Destination guides",
        "Local information",
        "Travel tips",
        "Cultural insights",
        "Recommendation system"
      ],
      "created_at": "2025-02-17 03:51:35.439994+00"
    },
    {
      "id": "d0a1361b-00ca-40e6-9bfd-c746045aef7e",
      "category_id": "2df7ca8f-8c26-4414-8b81-af75da52709d",
      "name": "Travel Planning",
      "description": "Tools for planning and organizing travel itineraries",
      "slug": "travel-planning",
      "icon": "Plane",
      "features": [
        "Itinerary planning",
        "Travel scheduling",
        "Budget management",
        "Destination research",
        "Trip optimization"
      ],
      "created_at": "2025-02-17 03:51:35.439994+00"
    },
    {
      "id": "391513aa-bf7f-469f-bc5e-b87026d74b7f",
      "category_id": "2df7ca8f-8c26-4414-8b81-af75da52709d",
      "name": "Trip Organization",
      "description": "Tools for organizing and managing travel details",
      "slug": "trip-organization",
      "icon": "FolderKanban",
      "features": [
        "Document management",
        "Travel checklist",
        "Expense tracking",
        "Activity planning",
        "Travel timeline"
      ],
      "created_at": "2025-02-17 03:51:35.439994+00"
    },
    {
      "id": "113b601b-c9c9-44bf-b03a-7a564e3cc660",
      "category_id": "22f8237e-023d-416b-8220-ddb158c3fc67",
      "name": "Unique Solutions",
      "description": "Specialized tools for unique use cases",
      "slug": "unique-solutions",
      "icon": "Puzzle",
      "features": [
        "Custom solutions",
        "Specialized features",
        "Unique workflows",
        "Niche applications",
        "Custom integration"
      ],
      "created_at": "2025-02-17 03:52:25.277742+00"
    },
    {
      "id": "6f0fd05c-ee94-4a5f-b850-b6d03857753f",
      "category_id": "2eb80fd0-294c-4995-b867-48a371a9690d",
      "name": "Version Control",
      "description": "Tools for managing code versions and collaboration",
      "slug": "version-control",
      "icon": "GitBranch",
      "features": [
        "Code versioning",
        "Branch management",
        "Merge handling",
        "Collaboration tools",
        "History tracking"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "6f213de3-0d1c-4f0c-8b4a-19120bd909c4",
      "category_id": "88ffd471-4e30-4ba8-9109-0e1280de9831",
      "name": "Video Conferencing",
      "description": "Solutions for virtual meetings and video calls",
      "slug": "video-conferencing",
      "icon": "Video",
      "features": [
        "Video calls",
        "Screen sharing",
        "Meeting recording",
        "Chat features",
        "Virtual backgrounds"
      ],
      "created_at": "2025-02-17 03:51:35.439994+00"
    },
    {
      "id": "fe035358-4df9-46fe-8a44-5f508fca63e3",
      "category_id": "5bbe32ce-3973-4833-8349-6fa8dbf55b36",
      "name": "Virtual Classrooms",
      "description": "Platforms for online teaching and learning environments",
      "slug": "virtual-classrooms",
      "icon": "MonitorPlay",
      "features": [
        "Live sessions",
        "Interactive tools",
        "Resource sharing",
        "Student engagement",
        "Recording capabilities"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    },
    {
      "id": "78ae3874-bb1c-4125-92fc-76d73a17280d",
      "category_id": "d6743a26-0d38-44b1-aa5c-cfa40b719e88",
      "name": "Wellness Education",
      "description": "Educational resources for health and wellness",
      "slug": "wellness-education",
      "icon": "GraduationCap",
      "features": [
        "Health information",
        "Educational content",
        "Resource library",
        "Learning tools",
        "Progress tracking"
      ],
      "created_at": "2025-02-17 03:52:12.029956+00"
    }
  ]
