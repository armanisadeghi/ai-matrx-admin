import { Headphones } from "@mynaui/icons-react";
import {
    Braces,
    Code,
    Calculator,
    Globe,
    Search,
    Thermometer,
    FileText,
    Cloud,
    Settings,
    Plane,
    BarChart,
    ShoppingCart,
    Map,
    Notebook,
    Mail,
    MessageSquare,
    Phone,
    CheckSquare,
    Calendar,
    Mic,
    Star,
    Brain,
    Home,
    Mic2,
    Lock,
    Edit,
    Film,
    Image,
    Video,
} from "lucide-react";

// Tool type definition
export interface Tool {
    id: string;
    name: string;
    description: string;
    category: string;
    icon: React.ReactNode;
}

export const allTools: Tool[] = [
    // Code Tools
    {
        id: "python",
        name: "Run Python Code",
        description: "Execute Python code to process data or perform complex operations",
        category: "Code",
        icon: <Code size={20} />,
    },
    {
        id: "javascript",
        name: "Run JavaScript",
        description: "Execute JavaScript code for web interactions and data manipulation",
        category: "Code",
        icon: <Braces size={20} />,
    },

    // Data Tools
    {
        id: "calculations",
        name: "Calculations",
        description: "Perform mathematical calculations, conversions, and financial estimates",
        category: "Data",
        icon: <Calculator size={20} />,
    },
    {
        id: "dataAnalysis",
        name: "Data Insights",
        description: "Analyze user data to provide summaries, trends, and predictions",
        category: "Data",
        icon: <BarChart size={20} />,
    },

    // Web Tools
    {
        id: "news",
        name: "Today's News",
        description: "Access latest news and current events tailored to your interests",
        category: "Web",
        icon: <Globe size={20} />,
    },
    {
        id: "search",
        name: "Web Search",
        description: "Search the internet for information, references, and real-time updates",
        category: "Web",
        icon: <Search size={20} />,
    },
    {
        id: "shopping",
        name: "Online Shopping Assistant",
        description: "Find products, compare prices, and complete purchases online",
        category: "Web",
        icon: <ShoppingCart size={20} />,
    },

    // Location Tools
    {
        id: "weather",
        name: "Local Weather",
        description: "Get current weather conditions, forecasts, and travel alerts",
        category: "Location",
        icon: <Thermometer size={20} />,
    },
    {
        id: "maps",
        name: "Navigation",
        description: "Get directions, traffic updates, and location-based recommendations",
        category: "Location",
        icon: <Map size={20} />,
    },

    // Files Tools
    {
        id: "documents",
        name: "Access User Documents",
        description: "Read, summarize, and analyze files uploaded by the user",
        category: "Files",
        icon: <FileText size={20} />,
    },
    {
        id: "cloud",
        name: "Cloud Storage",
        description: "Access, upload, and manage files in cloud services like Google Drive or Dropbox",
        category: "Files",
        icon: <Cloud size={20} />,
    },
    {
        id: "noteTaking",
        name: "Note-Taking",
        description: "Create, organize, and retrieve notes with smart categorization",
        category: "Files",
        icon: <Notebook size={20} />,
    },

    // Communication Tools
    {
        id: "email",
        name: "Send Email",
        description: "Draft, send, and manage emails with personalized templates",
        category: "Communication",
        icon: <Mail size={20} />,
    },
    {
        id: "text",
        name: "Send Text Message",
        description: "Compose and send SMS messages to contacts",
        category: "Communication",
        icon: <MessageSquare size={20} />,
    },
    {
        id: "call",
        name: "Make Phone Call",
        description: "Initiate calls and manage call schedules",
        category: "Communication",
        icon: <Phone size={20} />,
    },

    // Task Management Tools
    {
        id: "tasks",
        name: "Task Manager",
        description: "Create, track, and prioritize tasks with reminders and deadlines",
        category: "Tasks",
        icon: <CheckSquare size={20} />,
    },
    {
        id: "calendar",
        name: "Calendar Updates",
        description: "Schedule events, update appointments, and sync with calendars",
        category: "Tasks",
        icon: <Calendar size={20} />,
    },
    {
        id: "meetingSummary",
        name: "Meeting Summarizer",
        description: "Record and summarize meetings with action items",
        category: "Tasks",
        icon: <Mic size={20} />,
    },

    // Personalization Tools
    {
        id: "recommendations",
        name: "Personalized Recommendations",
        description: "Get tailored suggestions for news, entertainment, or shopping",
        category: "Personalization",
        icon: <Star size={20} />,
    },
    {
        id: "learning",
        name: "Adaptive Learning",
        description: "Adjust AI behavior based on your preferences and usage patterns",
        category: "Personalization",
        icon: <Brain size={20} />,
    },

    // Smart Home Tools
    {
        id: "smartHome",
        name: "Smart Home Control",
        description: "Manage lights, thermostats, and other connected devices",
        category: "Smart Home",
        icon: <Home size={20} />,
    },
    {
        id: "voice",
        name: "Voice Commands",
        description: "Interact with the AI using natural voice instructions",
        category: "Smart Home",
        icon: <Mic2 size={20} />,
    },

    // Multimedia Tools (New Category)
    {
        id: "imageGen",
        name: "Generate Images",
        description: "Create images from text descriptions using AI generation tools",
        category: "Multimedia",
        icon: <Image size={20} />,
    },
    {
        id: "videoGen",
        name: "Generate Videos",
        description: "Produce short videos based on text prompts or templates",
        category: "Multimedia",
        icon: <Video size={20} />,
    },
    {
        id: "imageToImage",
        name: "Image Modification",
        description: "Transform one image into another with style or content changes",
        category: "Multimedia",
        icon: <Edit size={20} />,
    },
    {
        id: "imageToVideo",
        name: "Image to Video",
        description: "Convert static images into animated videos with AI",
        category: "Multimedia",
        icon: <Film size={20} />,
    },
    {
        id: "transcribeAudio",
        name: "Transcribe Audio",
        description: "Convert audio recordings or speech into written text",
        category: "Multimedia",
        icon: <Headphones size={20} />,
    },

    // Advanced Tools
    {
        id: "settings",
        name: "Custom Settings",
        description: "Customize AI behavior, privacy options, and tool preferences",
        category: "Advanced",
        icon: <Settings size={20} />,
    },
    {
        id: "privacy",
        name: "Privacy Manager",
        description: "Control data access, review usage, and ensure security",
        category: "Advanced",
        icon: <Lock size={20} />,
    },
    {
        id: "travel",
        name: "Travel Planner",
        description: "Book flights, hotels, and plan itineraries with real-time updates",
        category: "Advanced",
        icon: <Plane size={20} />,
    },
];
