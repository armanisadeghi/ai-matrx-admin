// Types for category structure
export type CategorySlug = string;
export type SubcategorySlug = string;

interface CategoryDetail {
    label: string;
    slug: CategorySlug;
    subcategories: {
        [key: SubcategorySlug]: {
            label: string;
            slug: SubcategorySlug;
        };
    };
}

export type CategoryStructure = {
    [key: CategorySlug]: CategoryDetail;
};

export const APP_CATEGORIES: CategoryStructure = {
    "business-enterprise": {
        label: "Business & Enterprise",
        slug: "business-enterprise",
        subcategories: {
            "project-management": {
                label: "Project Management",
                slug: "project-management",
            },
            "team-management": {
                label: "Team Management",
                slug: "team-management",
            },
            "resource-planning": {
                label: "Resource Planning",
                slug: "resource-planning",
            },
            crm: {
                label: "CRM",
                slug: "crm",
            },
            "document-management": {
                label: "Document Management",
                slug: "document-management",
            },
            "business-intelligence": {
                label: "Business Intelligence",
                slug: "business-intelligence",
            },
            "hr-recruitment": {
                label: "HR & Recruitment",
                slug: "hr-recruitment",
            },
            "operations-management": {
                label: "Operations Management",
                slug: "operations-management",
            },
            "business-process-automation": {
                label: "Business Process Automation",
                slug: "business-process-automation",
            },
        },
    },
    "data-analytics": {
        label: "Data & Analytics",
        slug: "data-analytics",
        subcategories: {
            "data-visualization": {
                label: "Data Visualization",
                slug: "data-visualization",
            },
            "business-intelligence": {
                label: "Business Intelligence",
                slug: "business-intelligence",
            },
            "reporting-tools": {
                label: "Reporting Tools",
                slug: "reporting-tools",
            },
            "data-processing": {
                label: "Data Processing",
                slug: "data-processing",
            },
            "analytics-dashboards": {
                label: "Analytics Dashboards",
                slug: "analytics-dashboards",
            },
            "machine-learning-tools": {
                label: "Machine Learning Tools",
                slug: "machine-learning-tools",
            },
            "data-integration": {
                label: "Data Integration",
                slug: "data-integration",
            },
            "statistical-analysis": {
                label: "Statistical Analysis",
                slug: "statistical-analysis",
            },
            "predictive-analytics": {
                label: "Predictive Analytics",
                slug: "predictive-analytics",
            },
        },
    },
    "commerce-marketing": {
        label: "Commerce & Marketing",
        slug: "commerce-marketing",
        subcategories: {
            "e-commerce-platforms": {
                label: "E-commerce Platforms",
                slug: "e-commerce-platforms",
            },
            "digital-marketing": {
                label: "Digital Marketing",
                slug: "digital-marketing",
            },
            "email-marketing": {
                label: "Email Marketing",
                slug: "email-marketing",
            },
            "social-media-marketing": {
                label: "Social Media Marketing",
                slug: "social-media-marketing",
            },
            "seo-tools": {
                label: "SEO Tools",
                slug: "seo-tools",
            },
            "marketing-analytics": {
                label: "Marketing Analytics",
                slug: "marketing-analytics",
            },
            "customer-engagement": {
                label: "Customer Engagement",
                slug: "customer-engagement",
            },
            "marketplace-management": {
                label: "Marketplace Management",
                slug: "marketplace-management",
            },
            "advertising-tools": {
                label: "Advertising Tools",
                slug: "advertising-tools",
            },
            "sales-management": {
                label: "Sales Management",
                slug: "sales-management",
            },
        },
    },
    "social-community": {
        label: "Social & Community",
        slug: "social-community",
        subcategories: {
            "community-management": {
                label: "Community Management",
                slug: "community-management",
            },
            "social-networks": {
                label: "Social Networks",
                slug: "social-networks",
            },
            "forums-discussion": {
                label: "Forums & Discussion",
                slug: "forums-discussion",
            },
            "member-management": {
                label: "Member Management",
                slug: "member-management",
            },
            "content-moderation": {
                label: "Content Moderation",
                slug: "content-moderation",
            },
            "event-management": {
                label: "Event Management",
                slug: "event-management",
            },
            "social-media-integration": {
                label: "Social Media Integration",
                slug: "social-media-integration",
            },
            "user-generated-content": {
                label: "User Generated Content",
                slug: "user-generated-content",
            },
        },
    },
    "media-entertainment": {
        label: "Media & Entertainment",
        slug: "media-entertainment",
        subcategories: {
            "content-management": {
                label: "Content Management",
                slug: "content-management",
            },
            "media-players": {
                label: "Media Players",
                slug: "media-players",
            },
            "streaming-tools": {
                label: "Streaming Tools",
                slug: "streaming-tools",
            },
            "audio-processing": {
                label: "Audio Processing",
                slug: "audio-processing",
            },
            "video-processing": {
                label: "Video Processing",
                slug: "video-processing",
            },
            "image-editing": {
                label: "Image Editing",
                slug: "image-editing",
            },
            "digital-asset-management": {
                label: "Digital Asset Management",
                slug: "digital-asset-management",
            },
            "gaming-interactive": {
                label: "Gaming & Interactive",
                slug: "gaming-interactive",
            },
            "entertainment-platforms": {
                label: "Entertainment Platforms",
                slug: "entertainment-platforms",
            },
        },
    },
    "developer-tools-utilities": {
        label: "Developer Tools & Utilities",
        slug: "developer-tools-utilities",
        subcategories: {
            "code-editors": {
                label: "Code Editors",
                slug: "code-editors",
            },
            "testing-tools": {
                label: "Testing Tools",
                slug: "testing-tools",
            },
            "debugging-tools": {
                label: "Debugging Tools",
                slug: "debugging-tools",
            },
            "api-development": {
                label: "API Development",
                slug: "api-development",
            },
            "development-workflows": {
                label: "Development Workflows",
                slug: "development-workflows",
            },
            "version-control": {
                label: "Version Control",
                slug: "version-control",
            },
            "documentation-tools": {
                label: "Documentation Tools",
                slug: "documentation-tools",
            },
            "code-generation": {
                label: "Code Generation",
                slug: "code-generation",
            },
            "performance-monitoring": {
                label: "Performance Monitoring",
                slug: "performance-monitoring",
            },
            "devops-tools": {
                label: "DevOps Tools",
                slug: "devops-tools",
            },
        },
    },

    "health-wellness": {
        label: "Health & Wellness",
        slug: "health-wellness",
        subcategories: {
            "fitness-tracking": {
                label: "Fitness Tracking",
                slug: "fitness-tracking",
            },
            "health-monitoring": {
                label: "Health Monitoring",
                slug: "health-monitoring",
            },
            "mental-health": {
                label: "Mental Health",
                slug: "mental-health",
            },
            "meditation-mindfulness": {
                label: "Meditation & Mindfulness",
                slug: "meditation-mindfulness",
            },
            "nutrition-planning": {
                label: "Nutrition Planning",
                slug: "nutrition-planning",
            },
            "healthcare-management": {
                label: "Healthcare Management",
                slug: "healthcare-management",
            },
            "medical-records": {
                label: "Medical Records",
                slug: "medical-records",
            },
            "wellness-education": {
                label: "Wellness Education",
                slug: "wellness-education",
            },
            telemedicine: {
                label: "Telemedicine",
                slug: "telemedicine",
            },
        },
    },
    "education-learning": {
        label: "Education & Learning",
        slug: "education-learning",
        subcategories: {
            "learning-management": {
                label: "Learning Management",
                slug: "learning-management",
            },
            "course-creation": {
                label: "Course Creation",
                slug: "course-creation",
            },
            "assessment-tools": {
                label: "Assessment Tools",
                slug: "assessment-tools",
            },
            "student-management": {
                label: "Student Management",
                slug: "student-management",
            },
            "virtual-classrooms": {
                label: "Virtual Classrooms",
                slug: "virtual-classrooms",
            },
            "educational-content": {
                label: "Educational Content",
                slug: "educational-content",
            },
            "training-development": {
                label: "Training & Development",
                slug: "training-development",
            },
            "knowledge-management": {
                label: "Knowledge Management",
                slug: "knowledge-management",
            },
            "language-learning": {
                label: "Language Learning",
                slug: "language-learning",
            },
        },
    },
    "personal-tools-productivity": {
        label: "Personal Tools & Productivity",
        slug: "personal-tools-productivity",
        subcategories: {
            "task-management": {
                label: "Task Management",
                slug: "task-management",
            },
            "time-tracking": {
                label: "Time Tracking",
                slug: "time-tracking",
            },
            "note-taking": {
                label: "Note Taking",
                slug: "note-taking",
            },
            "personal-organization": {
                label: "Personal Organization",
                slug: "personal-organization",
            },
            "goal-setting": {
                label: "Goal Setting",
                slug: "goal-setting",
            },
            "habit-tracking": {
                label: "Habit Tracking",
                slug: "habit-tracking",
            },
            "calendar-management": {
                label: "Calendar Management",
                slug: "calendar-management",
            },
            "personal-finance": {
                label: "Personal Finance",
                slug: "personal-finance",
            },
            "life-planning": {
                label: "Life Planning",
                slug: "life-planning",
            },
        },
    },
    "communication-collaboration": {
        label: "Communication & Collaboration",
        slug: "communication-collaboration",
        subcategories: {
            "team-chat": {
                label: "Team Chat",
                slug: "team-chat",
            },
            "video-conferencing": {
                label: "Video Conferencing",
                slug: "video-conferencing",
            },
            "file-sharing": {
                label: "File Sharing",
                slug: "file-sharing",
            },
            "project-collaboration": {
                label: "Project Collaboration",
                slug: "project-collaboration",
            },
            "document-collaboration": {
                label: "Document Collaboration",
                slug: "document-collaboration",
            },
            "meeting-management": {
                label: "Meeting Management",
                slug: "meeting-management",
            },
            "email-messaging": {
                label: "Email & Messaging",
                slug: "email-messaging",
            },
            "remote-work-tools": {
                label: "Remote Work Tools",
                slug: "remote-work-tools",
            },
            "team-coordination": {
                label: "Team Coordination",
                slug: "team-coordination",
            },
        },
    },
    "travel-lifestyle": {
        label: "Travel & Lifestyle",
        slug: "travel-lifestyle",
        subcategories: {
            "travel-planning": {
                label: "Travel Planning",
                slug: "travel-planning",
            },
            "booking-systems": {
                label: "Booking Systems",
                slug: "booking-systems",
            },
            "trip-organization": {
                label: "Trip Organization",
                slug: "trip-organization",
            },
            "location-services": {
                label: "Location Services",
                slug: "location-services",
            },
            "lifestyle-management": {
                label: "Lifestyle Management",
                slug: "lifestyle-management",
            },
            "experience-planning": {
                label: "Experience Planning",
                slug: "experience-planning",
            },
            "travel-guides": {
                label: "Travel Guides",
                slug: "travel-guides",
            },
            "accommodation-management": {
                label: "Accommodation Management",
                slug: "accommodation-management",
            },
            "local-discovery": {
                label: "Local Discovery",
                slug: "local-discovery",
            },
        },
    },

    "other-miscellaneous": {
        label: "Other & Miscellaneous",
        slug: "other-miscellaneous",
        subcategories: {
            experimental: {
                label: "Experimental",
                slug: "experimental",
            },
            "multi-purpose": {
                label: "Multi-purpose",
                slug: "multi-purpose",
            },
            "unique-solutions": {
                label: "Unique Solutions",
                slug: "unique-solutions",
            },
            "emerging-technologies": {
                label: "Emerging Technologies",
                slug: "emerging-technologies",
            },
            "specialized-tools": {
                label: "Specialized Tools",
                slug: "specialized-tools",
            },
            "cross-category-applications": {
                label: "Cross-category Applications",
                slug: "cross-category-applications",
            },
        },
    },
};

// Helper functions for working with categories
export const getCategoryOptions = () => {
    return Object.values(APP_CATEGORIES).map(({ label, slug }) => ({
        label,
        value: slug,
    }));
};

export const getSubcategoryOptions = (categorySlug: CategorySlug) => {
    const category = APP_CATEGORIES[categorySlug];
    if (!category) return [];

    return Object.values(category.subcategories).map(({ label, slug }) => ({
        label,
        value: slug,
    }));
};

export const getCategoryBySlug = (slug: CategorySlug) => {
    return APP_CATEGORIES[slug];
};

export const getSubcategoryBySlug = (categorySlug: CategorySlug, subcategorySlug: SubcategorySlug) => {
    const category = APP_CATEGORIES[categorySlug];
    if (!category) return null;
    return category.subcategories[subcategorySlug] || null;
};

// Type guards
export const isValidCategory = (slug: string): slug is CategorySlug => {
    return slug in APP_CATEGORIES;
};

export const isValidSubcategory = (categorySlug: CategorySlug, subcategorySlug: string): subcategorySlug is SubcategorySlug => {
    const category = APP_CATEGORIES[categorySlug];
    return category ? subcategorySlug in category.subcategories : false;
};

// Path generation helpers
export const getCategoryPath = (categorySlug: CategorySlug) => {
    return `/apps/${categorySlug}`;
};

export const getSubcategoryPath = (categorySlug: CategorySlug, subcategorySlug: SubcategorySlug) => {
    return `/apps/${categorySlug}/${subcategorySlug}`;
};


export const FORBIDDEN_SLUGS = ['matrx', 'matrix', 'app', 'applet'];

export const isSlugInUse = (slug: string): boolean => {
    // Check if slug is in forbidden list
    if (FORBIDDEN_SLUGS.includes(slug.toLowerCase())) {
        return true;
    }

    // Check if slug is used as a category slug
    if (slug in APP_CATEGORIES) {
        return true;
    }

    // Check if slug is used as a subcategory slug in any category
    return Object.values(APP_CATEGORIES).some(category => 
        slug in category.subcategories
    );
};