import { BookmarkTabConfig } from "@/components/socket-io/presets/preset-manager/responses/admin-tabs/SocketBookmarkTab";
import { 
    FileText, 
    AlignLeft, 
    Layout, 
    Type, 
    Hash, 
    Heading, 
    Grid3X3, 
    Tag, 
    Play, 
    Puzzle, 
    BookOpen 
} from "lucide-react";

export const workflowNodeCustomTabs: BookmarkTabConfig[] = [
    {
        bookmark: 'data[0]["result"]["content"]',
        tabName: "Content",
        component: "BasicMarkdownContent",
        icon: <FileText className="w-5 h-5 text-primary" />,
    },
    {
        bookmark: 'data[0]["result"]["lines"]',
        tabName: "Lines",
        component: "LinesViewer",
        icon: <AlignLeft className="w-5 h-5 text-primary" />,
    },
    {
        bookmark: 'data[0]["result"]["sections"]',
        tabName: "Sections",
        component: "SectionViewerWithSidebar",
        icon: <Layout className="w-5 h-5 text-primary" />,
    },
    {
        bookmark: 'data[0]["result"]["section_texts"]',
        tabName: "Section Texts",
        component: "IntelligentViewer",
        icon: <Type className="w-5 h-5 text-primary" />,
    },
    {
        bookmark: 'data[0]["result"]["sections_by_header"]',
        tabName: "by Header",
        component: "SectionViewer",
        icon: <Hash className="w-5 h-5 text-primary" />,
    },
    {
        bookmark: 'data[0]["result"]["section_texts_by_header"]',
        tabName: "by Header Text",
        component: "IntelligentViewer",
        icon: <Heading className="w-5 h-5 text-primary" />,
    },
    {
        bookmark: 'data[0]["result"]["sections_by_big_headers"]',
        tabName: "By Big Headers",
        component: "IntelligentViewer",
        icon: <Grid3X3 className="w-5 h-5 text-primary" />,
    },
    {
        bookmark: 'data[0]["result"]["section_texts_by_big_headers"]',
        tabName: "By Big Headers Text",
        component: "IntelligentViewer",
        icon: <Tag className="w-5 h-5 text-primary" />,
    },
    {
        bookmark: 'data[1]["executed_functions"]',
        tabName: "Executed Functions",
        component: "RawJsonExplorer",
        icon: <Play className="w-5 h-5 text-primary" />,
    },
    {
        bookmark: 'data[1]["other_functions"]',
        tabName: "Other Functions",
        component: "RawJsonExplorer",
        icon: <Puzzle className="w-5 h-5 text-primary" />,
    },
    {
        bookmark: 'data[1]["summary"]',
        tabName: "Summary",
        component: "RawJsonExplorer",
        icon: <BookOpen className="w-5 h-5 text-primary" />,
    },
];