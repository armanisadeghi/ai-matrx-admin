import {
    IconAccessible,
    IconAdjustmentsBolt,
    IconAlertOctagon,
    IconApi, IconBox,
    IconBrandCloudflare,
    IconBug,
    IconCalendar, IconChartBar,
    IconChartLine,
    IconClipboard,
    IconCloud,
    IconCloudShare,
    IconCode,
    IconDashboard,
    IconDatabase,
    IconDownload,
    IconFile,
    IconFishHook,
    IconFlag,
    IconFolder,
    IconGitBranch,
    IconHistory,
    IconImageInPicture,
    IconLock,
    IconLogs, IconMagnet,
    IconMaximize,
    IconMinimize,
    IconPencil,
    IconRefresh,
    IconRestore,
    IconRobot,
    IconSettings,
    IconShield,
    IconShieldLock,
    IconSquareToggle,
    IconTestPipe,
    IconUpload,
    IconUsers
} from "@tabler/icons-react";
import AdminComponentOne from "@/app/(authenticated)/admin/components/AdminComponetOne";
import React from "react";
import {CiFloppyDisk} from "react-icons/ci";
import LocalFileAccess from "@/app/(authenticated)/admin/components/LocalFileAccess";
import CommandTestPage from "@/app/(authenticated)/admin/components/command-testers/CommandTestPage";
import EntityTestingLab from "@/app/(authenticated)/admin/components/entities/EntityTestingLab";
import EntityTester from "@/app/(authenticated)/admin/components/entities/EntityTester";
import EntityMetrics from "../components/entities/EntityMetrics";
import EntityBrowser from "../components/entities/EntityBrowser";
import EntityLab from "../components/entities/EntityLab";

export const adminCategories = [
    {
        name: "File Explorer & Basic Operations",
        icon: <IconFolder className="w-6 h-6" />,
        features: [
            {
                title: "Access Local",
                description: "Directly access and browse files stored on the local filesystem, enabling quick file management.",
                icon: <IconFolder />,
                component: <LocalFileAccess />
            },
            {
                title: "Save Local Files",
                description: "Easily save files locally from the application, ensuring that important data is kept within reach.",
                icon: <IconDatabase />,
                component: <AdminComponentOne />
            },
            {
                title: "Vercel File Operations",
                description: "Manage files directly in Vercel storage, allowing for seamless deployment and management of application assets.",
                icon: <IconCloud />,
                component: <AdminComponentOne />
            },
            {
                title: "AI Dream File Operations",
                description: "Integrate with AI Dream services for advanced file management operations, enhancing productivity and workflow.",
                icon: <IconRobot />,
                component: <AdminComponentOne />
            },
            {
                title: "Imagen File Operations",
                description: "Utilize Imagen services for specialized image file operations, including optimization and format conversion.",
                icon: <IconImageInPicture />,
                component: <AdminComponentOne />
            },
            {
                title: "Other Remote File Ops",
                description: "Perform various file operations on other remote storage solutions, providing flexibility in file management.",
                icon: <IconCloud />,
                component: <AdminComponentOne />
            },
            {
                title: "Bulk File Operations",
                description: "Support for bulk uploads, downloads, renaming, and deletions. Helpful for managing large projects with numerous assets.",
                icon: <IconUpload />,
                component: <AdminComponentOne />
            }
        ]
    },
    {
        name: "Entity Management & Testing",
        icon: <IconDatabase className="w-6 h-6" />,
        features: [
            {
                title: "Entity Operations Lab",
                description: "Comprehensive testing environment for entity operations, including CRUD, filtering, and real-time updates.",
                icon: <IconTestPipe />,
                component: <EntityTestingLab />
            },
            {
                title: "Entity Lab Using Special Select Header",
                description: "Comprehensive testing environment for entity operations, including CRUD, filtering, and real-time updates.",
                icon: <IconTestPipe />,
                component: <EntityLab />
            },
            {
                title: "Entity Tester",
                description: "Comprehensive testing interface for entity operations, allowing real-time CRUD operations, data inspection, and performance monitoring across all system entities.",
                icon: <IconDatabase />,
                component: <EntityTester />
            },
            {
                title: "Entity Performance Metrics",
                description: "Monitor and analyze entity operation performance, caching efficiency, and state management.",
                icon: <IconChartBar />,
                component: <EntityMetrics />
            },
            {
                title: "Entity Matrx Table Browser",
                description: "Test Entity Data in the Matrx Table.",
                icon: <IconChartBar />,
                component: <EntityBrowser />
            }
        ]
    },
    {
        name: "Feature Testing",
        icon: <IconTestPipe className="w-6 h-6" />,
        features: [
            {
                title: "Entity Command Tester",
                description: "Test the powerful Entity Commands which are directly plugged into Redux state.",
                icon: <IconSquareToggle />,
                component: <CommandTestPage />
            },
            // {
            //     title: "Entity Command GPT",
            //     description: "Test the interaction and state management of new UI components.",
            //     icon: <IconBox />,
            //     component: <AdminTestPage  entityKey={"registeredFunction"}/>
            // },
            // {
            //     title: "Entity Command 3",
            //     description: "Test the interaction and state management of new UI components.",
            //     icon: <IconBox />,
            //     component: <CommandTestPage5 />
            // },
            // {
            //     title: "Component Interaction Testing",
            //     description: "Test the interaction and state management of new UI components.",
            //     icon: <IconBox />,
            //     component: <AdminTestPage  entityKey={"registeredFunction"}/>
            // },
            {
                title: "Animation & Motion Testing",
                description: "Evaluate animations and transitions for smoothness and user experience.",
                icon: <IconMagnet />,
                component: <AdminComponentOne />
            },
            {
                title: "Form Validation Testing",
                description: "Test complex form validation scenarios, including async validation.",
                icon: <IconFolder />,
                component: <AdminComponentOne />
            },
            {
                title: "Responsive Layout Testing",
                description: "Examine responsiveness and breakpoints for new layouts across devices.",
                icon: <IconDashboard />,
                component: <AdminComponentOne />
            },
            {
                title: "API Integration Testing",
                description: "Verify API calls, including error handling and performance under load.",
                icon: <IconApi />,
                component: <AdminComponentOne />
            },
            {
                title: "Accessibility Testing",
                description: "Test accessibility features like keyboard navigation and screen reader support.",
                icon: <IconAccessible />,
                component: <AdminComponentOne />
            },

        ]
    },
    {
        name: "DevOps & Deployment",
        icon: <IconGitBranch className="w-6 h-6"/>,
        features: [
            {
                title: "Build & Deploy Pipelines",
                description: "Manage CI/CD workflows and deployment processes",
                icon: <IconGitBranch/>,
                component: <AdminComponentOne/>
            },
            {
                title: "Environment Management",
                description: "Control settings across dev, staging, and production",
                icon: <IconSettings/>,
                component: <AdminComponentOne/>
            },
            {
                title: "Release Management",
                description: "Handle feature flags and rollback controls",
                icon: <IconHistory/>,
                component: <AdminComponentOne/>
            }
        ]
    },
    {
        name: "Quality & Testing",
        icon: <IconTestPipe className="w-6 h-6"/>,
        features: [
            {
                title: "Testing Dashboard",
                description: "Monitor test coverage and results",
                icon: <IconTestPipe/>,
                component: <AdminComponentOne/>
            },
            {
                title: "Code Analysis",
                description: "View code quality metrics and vulnerabilities",
                icon: <IconBug/>,
                component: <AdminComponentOne/>
            }
        ]
    },
    {
        name: "System Health",
        icon: <IconChartLine className="w-6 h-6"/>,
        features: [
            {
                title: "Performance Monitoring",
                description: "Track application metrics and performance",
                icon: <IconChartLine/>,
                component: <AdminComponentOne/>
            },
            {
                title: "Error Tracking",
                description: "Monitor and manage system errors",
                icon: <IconBug/>,
                component: <AdminComponentOne/>
            }
        ]
    },
    {
        name: "Database & Data",
        icon: <IconDatabase className="w-6 h-6"/>,
        features: [
            {
                title: "Database Explorer",
                description: "Browse and query database contents",
                icon: <IconDatabase/>,
                component: <AdminComponentOne/>
            },
            {
                title: "Data Import/Export",
                description: "Bulk data operations and ETL processes",
                icon: <IconDownload/>,
                component: <AdminComponentOne/>
            }
        ]
    },
    {
        name: "Feature Management",
        icon: <IconFlag className="w-6 h-6"/>,
        features: [
            {
                title: "Feature Flags",
                description: "Toggle features and manage experiments",
                icon: <IconFlag/>,
                component: <AdminComponentOne/>
            },
            {
                title: "A/B Testing",
                description: "Manage and track experimental features",
                icon: <IconAdjustmentsBolt/>,
                component: <AdminComponentOne/>
            }
        ]
    },
    {
        name: "Security & Access",
        icon: <IconLock className="w-6 h-6"/>,
        features: [
            {
                title: "User Management",
                description: "Control user access and permissions",
                icon: <IconUsers/>,
                component: <AdminComponentOne/>
            },
            {
                title: "Security Tools",
                description: "Manage security settings and compliance",
                icon: <IconShieldLock/>,
                component: <AdminComponentOne/>
            }
        ]
    },
    {
        name: "Content & Config",
        icon: <IconPencil className="w-6 h-6"/>,
        features: [
            {
                title: "CMS Tools",
                description: "Manage content and components",
                icon: <IconPencil/>,
                component: <AdminComponentOne/>
            },
            {
                title: "Configuration",
                description: "System-wide settings and variables",
                icon: <IconSettings/>,
                component: <AdminComponentOne/>
            }
        ]
    },
    {
        name: "Automation & Tasks",
        icon: <IconRobot className="w-6 h-6"/>,
        features: [
            {
                title: "Task Automation",
                description: "Schedule and manage automated tasks",
                icon: <IconRobot/>,
                component: <AdminComponentOne/>
            },
            {
                title: "Script Console",
                description: "Execute maintenance and automation scripts",
                icon: <IconClipboard/>,
                component: <AdminComponentOne/>
            }
        ]
    },
    {
        name: "Environment-Specific Storage Management",
        icon: <IconCloud className="w-6 h-6" />,
        features: [
            {
                title: "Environment Toggle",
                description: "Easily switch between local, staging, and production environments to manage files specific to each.",
                icon: <IconSquareToggle />,
                component: <AdminComponentOne />
            },
            {
                title: "Environment-Specific Storage Access",
                description: "Local File System: Manage files directly on local development environments. Cloud Storage (e.g., Vercel): Direct interaction with cloud storage for staging and production.",
                icon: <IconCloudShare />,
                component: <AdminComponentOne />
            },
            {
                title: "Sync Tools",
                description: "Automated Sync: Set up rules for automatic syncing of files or directories across environments. Selective Sync: Choose specific files or folders to sync, ideal for deploying only certain assets.",
                icon: <IconRefresh />,
                component: <AdminComponentOne />
            }
        ]
    },
    {
        name: "File Versioning & History Management",
        icon: <IconHistory className="w-6 h-6" />,
        features: [
            {
                title: "File Versioning",
                description: "Track file changes and maintain a version history. Options to rollback to previous versions, with tagging capabilities for major updates.",
                icon: <IconFile />,
                component: <AdminComponentOne />
            },
            {
                title: "Audit Trail for Changes",
                description: "Log all file interactions (uploads, downloads, edits) with user details, enhancing transparency and compliance.",
                icon: <IconLogs />,
                component: <AdminComponentOne />
            }
        ]
    },
    {
        name: "Asset Optimization & CDN Management",
        icon: <IconMaximize className="w-6 h-6" />,
        features: [
            {
                title: "Compression & Format Conversion",
                description: "Automated image and video compression before uploading to cloud storage, optimizing performance. Format conversion tools for ensuring compatibility (e.g., converting PNGs to WebP).",
                icon: <IconMinimize />,
                component: <AdminComponentOne />
            },
            {
                title: "Content Delivery Network (CDN) Controls",
                description: "Cache Invalidation: Invalidate CDN cache after file updates, enabling immediate refresh for updated assets. Link Management: Generate shareable, expiring URLs for temporary access to files.",
                icon: <IconBrandCloudflare />,
                component: <AdminComponentOne />
            }
        ]
    },
    {
        name: "Storage Quota & Usage Monitoring",
        icon: <IconDatabase className="w-6 h-6" />,
        features: [
            {
                title: "Storage Usage Dashboard",
                description: "Visual representation of storage usage across environments. Insights into high-storage files or directories and options for quota alerts.",
                icon: <IconDashboard />,
                component: <AdminComponentOne />
            },
            {
                title: "Alerts & Usage Warnings",
                description: "Notifications when nearing storage limits or encountering large files, ensuring proactive management of storage resources.",
                icon: <IconAlertOctagon />,
                component: <AdminComponentOne />
            }
        ]
    },
    {
        name: "Advanced File Permissions & Access Control",
        icon: <IconShield className="w-6 h-6" />,
        features: [
            {
                title: "Granular File Permissions",
                description: "File and folder-level permissions to restrict access based on user roles. Customizable permissions for different environments or user groups.",
                icon: <IconLock />,
                component: <AdminComponentOne />
            },
            {
                title: "Access Monitoring & Logs",
                description: "Detailed logs for all access attempts, including timestamps and user information. Notifications or alerts for unauthorized access attempts.",
                icon: <IconLogs />,
                component: <AdminComponentOne />
            }
        ]
    },
    {
        name: "File Backup & Restore",
        icon: <CiFloppyDisk className="w-6 h-6" />,
        features: [
            {
                title: "Automated Backup Scheduling",
                description: "Configure regular backups for critical files and directories, especially in production environments.",
                icon: <IconCalendar />,
                component: <AdminComponentOne />
            },
            {
                title: "Restore Options",
                description: "One-click restore options for entire folders or specific files. Partial restore options for selective file recovery from backups.",
                icon: <IconRestore />,
                component: <AdminComponentOne />
            }
        ]
    },
    {
        name: "Developer Tools & Integrations",
        icon: <IconCode className="w-6 h-6" />,
        features: [
            {
                title: "Custom Hooks for File Events",
                description: "Pre-upload and post-upload hooks to trigger validation or processing actions automatically.",
                icon: <IconFishHook />,
                component: <AdminComponentOne />
            },
            {
                title: "API & Webhook Integration",
                description: "REST API access for file operations, enabling programmatic control from scripts or third-party tools. Webhook notifications for custom events, such as file uploads or errors.",
                icon: <IconApi />,
                component: <AdminComponentOne />
            }
        ]
    }
];

