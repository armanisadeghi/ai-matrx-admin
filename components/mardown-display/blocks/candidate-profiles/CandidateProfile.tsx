import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MoreHorizontal, Edit, Trash, Plus, Check, Save, Briefcase, MapPin, DollarSign, Calendar } from "lucide-react";
import {
    CandidateProfileType,
    ProfileSectionType,
    ExperienceItemType,
    ProfileItemType,
    parseMarkdownProfile,
    extractHighlights,
} from "./parseMarkdownProfile";
import { MdWork } from "react-icons/md";

// Props interface
export type CandidateProfileProps = {
    content: string;
    onSave?: (updatedContent: string) => void;
    editable?: boolean;
};

// Main component
const CandidateProfile = ({ content, onSave = () => {}, editable = true }: CandidateProfileProps) => {
    const [profile, setProfile] = useState<CandidateProfileType | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSection, setEditingSection] = useState<ProfileSectionType | null>(null);
    const [editingExperience, setEditingExperience] = useState<ExperienceItemType | null>(null);
    const [editingItem, setEditingItem] = useState<ProfileItemType | null>(null);
    const [editValue, setEditValue] = useState("");
    const [editTitle, setEditTitle] = useState("");
    const [editCompany, setEditCompany] = useState("");
    const [editType, setEditType] = useState<"section" | "experience" | "item">("item");
    const [editSectionType, setEditSectionType] = useState<"experience" | "text" | "keyValue">("text");
    const [editAction, setEditAction] = useState<"edit" | "add">("edit");
    const [editParentId, setEditParentId] = useState("");
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const originalProfileRef = useRef<CandidateProfileType | null>(null);

    // Parse the markdown content to extract profile structure
    useEffect(() => {
        if (!content) return;

        try {
            const parsedProfile = parseMarkdownProfile(content);
            setProfile(parsedProfile);

            // Set all sections to expanded by default
            const expanded: Record<string, boolean> = {};
            parsedProfile.sections.forEach((section) => {
                expanded[section.id] = true;
            });
            setExpandedSections(expanded);

            // Store original for potential reset
            if (!originalProfileRef.current) {
                originalProfileRef.current = JSON.parse(JSON.stringify(parsedProfile));
            }
        } catch (error) {
            console.error("Error parsing candidate profile:", error);
        }
    }, [content]);

    // Toggle section expansion
    const toggleSection = (sectionId: string) => {
        setExpandedSections((prev) => ({
            ...prev,
            [sectionId]: !prev[sectionId],
        }));
    };

    // Edit functions
    const openEditModal = (
        type: "section" | "experience" | "item",
        item: ProfileSectionType | ExperienceItemType | ProfileItemType,
        action: "edit" | "add" = "edit",
        parentId: string = ""
    ) => {
        setEditType(type);
        setEditAction(action);
        setEditParentId(parentId);

        if (type === "section") {
            const section = item as ProfileSectionType;
            setEditingSection(section);
            setEditTitle(section.title || "");
            setEditSectionType(section.type);
            setEditValue(section.content || "");
        } else if (type === "experience") {
            const experience = item as ExperienceItemType;
            setEditingExperience(experience);
            setEditTitle(experience.title || "");
            setEditCompany(experience.company || "");
            setEditValue("");
        } else if (type === "item") {
            const profileItem = item as ProfileItemType;
            setEditingItem(profileItem);
            setEditValue(profileItem.content.replace(/<\/?b>/g, "**") || "");
        }

        setIsEditModalOpen(true);
    };

    const handleEditSave = () => {
        if (editAction === "edit") {
            updateItem();
        } else {
            addNewItem();
        }

        setIsEditModalOpen(false);
        resetEditState();
    };

    const resetEditState = () => {
        setEditingSection(null);
        setEditingExperience(null);
        setEditingItem(null);
        setEditValue("");
        setEditTitle("");
        setEditCompany("");
        setEditParentId("");
    };

    const updateItem = () => {
        if (!profile) return;

        const updatedProfile = { ...profile };

        if (editType === "section" && editingSection) {
            // Find and update the section
            const sectionIndex = updatedProfile.sections.findIndex((s) => s.id === editingSection.id);
            if (sectionIndex >= 0) {
                updatedProfile.sections[sectionIndex] = {
                    ...updatedProfile.sections[sectionIndex],
                    title: editTitle,
                    type: editSectionType,
                    content: editValue,
                };
            }
        } else if (editType === "experience" && editingExperience) {
            // Find the parent section first
            updatedProfile.sections.forEach((section) => {
                if (section.experiences) {
                    const expIndex = section.experiences.findIndex((e) => e.id === editingExperience.id);
                    if (expIndex >= 0) {
                        section.experiences[expIndex] = {
                            ...section.experiences[expIndex],
                            title: editTitle,
                            company: editCompany,
                        };
                    }
                }
            });
        } else if (editType === "item" && editingItem) {
            // Process the content to handle bold
            const processedContent = editValue;

            // Try to find the item in different places
            let itemFound = false;

            // Check in section items
            updatedProfile.sections.forEach((section) => {
                if (section.items) {
                    const itemIndex = section.items.findIndex((i) => i.id === editingItem.id);
                    if (itemIndex >= 0) {
                        section.items[itemIndex] = {
                            ...section.items[itemIndex],
                            content: processedContent,
                        };
                        itemFound = true;
                    }
                }

                // Check in experience details
                if (!itemFound && section.experiences) {
                    section.experiences.forEach((exp) => {
                        const detailIndex = exp.details.findIndex((d) => d.id === editingItem.id);
                        if (detailIndex >= 0) {
                            exp.details[detailIndex] = {
                                ...exp.details[detailIndex],
                                content: processedContent,
                            };
                            itemFound = true;
                        }
                    });
                }
            });
        }

        setProfile(updatedProfile);
    };

    const addNewItem = () => {
        if (!profile) return;

        const updatedProfile = { ...profile };
        const { v4: uuidv4 } = require("uuid");

        if (editType === "section") {
            // Add new section
            const newSection: ProfileSectionType = {
                id: uuidv4(),
                title: editTitle,
                type: editSectionType,
                content: editValue,
                items: [],
            };

            updatedProfile.sections.push(newSection);

            // Set the new section to expanded
            setExpandedSections((prev) => ({
                ...prev,
                [newSection.id]: true,
            }));
        } else if (editType === "experience") {
            // Add new experience to parent section
            const parentSection = updatedProfile.sections.find((s) => s.id === editParentId);
            if (parentSection) {
                if (!parentSection.experiences) {
                    parentSection.experiences = [];
                }

                const newExperience: ExperienceItemType = {
                    id: uuidv4(),
                    title: editTitle,
                    company: editCompany,
                    details: [],
                };

                parentSection.experiences.push(newExperience);
            }
        } else if (editType === "item") {
            // Process the content for bold
            const processedContent = editValue;

            const newItem: ProfileItemType = {
                id: uuidv4(),
                content: processedContent,
                highlight: processedContent.includes("**"),
            };

            // Find the parent to add to
            if (editParentId) {
                // First check if parent is a section
                const parentSection = updatedProfile.sections.find((s) => s.id === editParentId);
                if (parentSection) {
                    if (!parentSection.items) {
                        parentSection.items = [];
                    }
                    parentSection.items.push(newItem);
                } else {
                    // Check if parent is an experience
                    let parentFound = false;
                    updatedProfile.sections.forEach((section) => {
                        if (section.experiences && !parentFound) {
                            const parentExp = section.experiences.find((e) => e.id === editParentId);
                            if (parentExp) {
                                parentExp.details.push(newItem);
                                parentFound = true;
                            }
                        }
                    });
                }
            }
        }

        setProfile(updatedProfile);
    };

    const deleteItem = (type: "section" | "experience" | "item", itemId: string) => {
        if (!profile) return;

        const updatedProfile = { ...profile };

        if (type === "section") {
            // Remove section
            const sectionIndex = updatedProfile.sections.findIndex((s) => s.id === itemId);
            if (sectionIndex >= 0) {
                updatedProfile.sections.splice(sectionIndex, 1);
            }
        } else if (type === "experience") {
            // Find and remove experience
            updatedProfile.sections.forEach((section) => {
                if (section.experiences) {
                    const expIndex = section.experiences.findIndex((e) => e.id === itemId);
                    if (expIndex >= 0) {
                        section.experiences.splice(expIndex, 1);
                    }
                }
            });
        } else if (type === "item") {
            // Try to find and remove item from different places
            let itemFound = false;

            // Check in section items
            updatedProfile.sections.forEach((section) => {
                if (section.items && !itemFound) {
                    const itemIndex = section.items.findIndex((i) => i.id === itemId);
                    if (itemIndex >= 0) {
                        section.items.splice(itemIndex, 1);
                        itemFound = true;
                    }
                }

                // Check in experience details
                if (!itemFound && section.experiences) {
                    section.experiences.forEach((exp) => {
                        const detailIndex = exp.details.findIndex((d) => d.id === itemId);
                        if (detailIndex >= 0) {
                            exp.details.splice(detailIndex, 1);
                            itemFound = true;
                        }
                    });
                }
            });
        }

        setProfile(updatedProfile);
    };

    // Reset to original profile
    const handleReset = () => {
        if (originalProfileRef.current) {
            setProfile(JSON.parse(JSON.stringify(originalProfileRef.current)));
        }
    };

    // Save current profile
    const handleSave = () => {
        if (!profile) return;

        // Here we would convert the profile back to markdown
        // For demonstration, we'll just show success
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);

        if (onSave) {
            // Convert profile back to markdown or send the data structure
            // onSave(profileToMarkdown(profile));
            onSave(JSON.stringify(profile));
        }
    };

    // Helper to render items with highlighting
    const renderContent = (content: string) => {
        if (!content) return null;

        // Replace <b> tags with spans
        return (
            <span
                dangerouslySetInnerHTML={{
                    __html: content.replace(/<b>(.*?)<\/b>/g, '<span class="font-semibold text-primary">$1</span>'),
                }}
            />
        );
    };

    // For debugging - helps identify parsing issues
    useEffect(() => {
        if (profile) {
            console.log("Parsed profile:", profile);
        }
    }, [profile]);

    // Context menu items for sections
    const SectionContextMenuItems = (section: ProfileSectionType) => (
        <>
            <ContextMenuItem onClick={() => openEditModal("section", section)}>
                <Edit className="h-4 w-4 mr-2" /> Edit Section
            </ContextMenuItem>
            <ContextMenuItem onClick={() => deleteItem("section", section.id)} className="text-destructive focus:text-destructive">
                <Trash className="h-4 w-4 mr-2" /> Delete Section
            </ContextMenuItem>
            <ContextMenuSeparator />

            {section.type === "experience" && (
                <ContextMenuItem
                    onClick={() => {
                        const newExp: ExperienceItemType = {
                            id: "temp-new",
                            title: "",
                            company: "",
                            details: [],
                        };
                        openEditModal("experience", newExp, "add", section.id);
                    }}
                >
                    <Plus className="h-4 w-4 mr-2" /> Add Experience
                </ContextMenuItem>
            )}

            <ContextMenuItem
                onClick={() => {
                    const newItem: ProfileItemType = {
                        id: "temp-new",
                        content: "",
                    };
                    openEditModal("item", newItem, "add", section.id);
                }}
            >
                <Plus className="h-4 w-4 mr-2" /> Add Item
            </ContextMenuItem>
        </>
    );

    // Context menu items for experiences
    const ExperienceContextMenuItems = (experience: ExperienceItemType, sectionId: string) => (
        <>
            <ContextMenuItem onClick={() => openEditModal("experience", experience)}>
                <Edit className="h-4 w-4 mr-2" /> Edit Experience
            </ContextMenuItem>
            <ContextMenuItem onClick={() => deleteItem("experience", experience.id)} className="text-destructive focus:text-destructive">
                <Trash className="h-4 w-4 mr-2" /> Delete Experience
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
                onClick={() => {
                    const newItem: ProfileItemType = {
                        id: "temp-new",
                        content: "",
                    };
                    openEditModal("item", newItem, "add", experience.id);
                }}
            >
                <Plus className="h-4 w-4 mr-2" /> Add Detail
            </ContextMenuItem>
        </>
    );

    // Context menu items for individual items
    const ItemContextMenuItems = (item: ProfileItemType) => (
        <>
            <ContextMenuItem onClick={() => openEditModal("item", item)}>
                <Edit className="h-4 w-4 mr-2 text-primary" /> Edit Item
            </ContextMenuItem>
            <ContextMenuItem onClick={() => deleteItem("item", item.id)} className="text-destructive focus:text-destructive">
                <Trash className="h-4 w-4 mr-2 text-destructive" /> Delete Item
            </ContextMenuItem>
        </>
    );

    // Section icon based on type
    const getSectionIcon = (type: string) => {
        switch (type) {
            case "experience":
                return <Briefcase className="h-4 w-4" />;
            case "location":
                return <MapPin className="h-4 w-4" />;
            case "compensation":
                return <DollarSign className="h-4 w-4" />;
            case "availability":
                return <Calendar className="h-4 w-4" />;
            default:
                return null;
        }
    };

    if (!profile) return <div>Loading profile...</div>;

    return (
        <TooltipProvider>
            <Card className="max-w-3xl border-none shadow-none bg-transparent">
                <CardHeader className="pb-2">
                    <div className="flex flex-col space-y-1">
                        <CardTitle className="text-xl font-bold">
                            Candidate: <span className="text-primary">{profile.name}</span>
                        </CardTitle>
                        {profile.subtitle && <p className="text-muted-foreground">{profile.subtitle}</p>}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-4 bg-transparent">
                    {profile.sections.map((section) => (
                        <ContextMenu key={section.id}>
                            <ContextMenuTrigger>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div
                                            className="flex items-center space-x-2 cursor-pointer"
                                            onClick={() => toggleSection(section.id)}
                                        >
                                            {getSectionIcon(section.title.toLowerCase())}
                                            <h3 className="text-lg pt-2 font-semibold">{section.title}</h3>
                                        </div>

                                        {editable && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Actions</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEditModal("section", section)}>
                                                        <Edit className="h-4 w-4 mr-2" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => deleteItem("section", section.id)}
                                                        className="text-destructive focus:text-destructive"
                                                    >
                                                        <Trash className="h-4 w-4 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />

                                                    {section.type === "experience" && (
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                const newExp: ExperienceItemType = {
                                                                    id: "temp-new",
                                                                    title: "",
                                                                    company: "",
                                                                    details: [],
                                                                };
                                                                openEditModal("experience", newExp, "add", section.id);
                                                            }}
                                                        >
                                                            <Plus className="h-4 w-4 mr-2" /> Add Experience
                                                        </DropdownMenuItem>
                                                    )}

                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            const newItem: ProfileItemType = {
                                                                id: "temp-new",
                                                                content: "",
                                                            };
                                                            openEditModal("item", newItem, "add", section.id);
                                                        }}
                                                    >
                                                        <Plus className="h-4 w-4 mr-2" /> Add Item
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>

                                    {expandedSections[section.id] && (
                                        <div className="pl-1 space-y-4">
                                            {/* Section content */}
                                            {section.content && (
                                                <p className="text-sm text-muted-foreground">{renderContent(section.content)}</p>
                                            )}

                                            {/* Experience type sections with companies and roles */}
                                            {section.type === "experience" &&
                                                section.experiences &&
                                                section.experiences.length > 0 &&
                                                section.experiences.map((exp) => (
                                                    <ContextMenu key={exp.id}>
                                                        <ContextMenuTrigger>
                                                            <div className="space-y-2 pl-1">
                                                                <div className="flex items-center justify-between group">
                                                                    <div>
                                                                        <h4 className="font-medium text-sm">
                                                                            <span className="font-semibold">{exp.company}</span>
                                                                            {exp.title && <> – {exp.title}</>}
                                                                        </h4>
                                                                    </div>

                                                                    {editable && (
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                >
                                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                                    <span className="sr-only">Actions</span>
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end">
                                                                                <DropdownMenuItem
                                                                                    onClick={() => openEditModal("experience", exp)}
                                                                                >
                                                                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem
                                                                                    onClick={() => deleteItem("experience", exp.id)}
                                                                                    className="text-destructive focus:text-destructive"
                                                                                >
                                                                                    <Trash className="h-4 w-4 mr-2" /> Delete
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem
                                                                                    onClick={() => {
                                                                                        const newItem: ProfileItemType = {
                                                                                            id: "temp-new",
                                                                                            content: "",
                                                                                        };
                                                                                        openEditModal("item", newItem, "add", exp.id);
                                                                                    }}
                                                                                >
                                                                                    <Plus className="h-4 w-4 mr-2" /> Add Detail
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    )}
                                                                </div>

                                                                {/* Experience bullet points */}
                                                                <ul className="space-y-2 list-disc list-inside text-sm ml-1">
                                                                    {exp.details.map((detail) => (
                                                                        <ContextMenu key={detail.id}>
                                                                            <ContextMenuTrigger>
                                                                                <li className="group relative">
                                                                                    <div className="inline">
                                                                                        {renderContent(detail.content)}
                                                                                    </div>

                                                                                    {editable && (
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-6 w-6 inline-flex opacity-0 group-hover:opacity-100 transition-opacity absolute -right-7 top-0"
                                                                                            onClick={() => openEditModal("item", detail)}
                                                                                        >
                                                                                            <Edit className="h-3 w-3" />
                                                                                            <span className="sr-only">Edit</span>
                                                                                        </Button>
                                                                                    )}
                                                                                </li>
                                                                            </ContextMenuTrigger>

                                                                            <ContextMenuContent>
                                                                                {ItemContextMenuItems(detail)}
                                                                            </ContextMenuContent>
                                                                        </ContextMenu>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </ContextMenuTrigger>

                                                        <ContextMenuContent>
                                                            {ExperienceContextMenuItems(exp, section.id)}
                                                        </ContextMenuContent>
                                                    </ContextMenu>
                                                ))}

                                            {/* Regular items for other section types */}
                                            {section.type !== "experience" &&
                                                section.items &&
                                                section.items.map((item) => (
                                                    <ContextMenu key={item.id}>
                                                        <ContextMenuTrigger>
                                                            <div className="relative group">
                                                                <div className="flex items-start space-x-2">
                                                                    <div className="min-w-4 mt-1">•</div>
                                                                    <div className="flex-1 text-sm">{renderContent(item.content)}</div>

                                                                    {editable && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            onClick={() => openEditModal("item", item)}
                                                                        >
                                                                            <Edit className="h-3 w-3" />
                                                                            <span className="sr-only">Edit</span>
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </ContextMenuTrigger>

                                                        <ContextMenuContent>{ItemContextMenuItems(item)}</ContextMenuContent>
                                                    </ContextMenu>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </ContextMenuTrigger>

                            <ContextMenuContent>{SectionContextMenuItems(section)}</ContextMenuContent>
                        </ContextMenu>
                    ))}

                    {/* Add new section button */}
                    {editable && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-4"
                            onClick={() => {
                                const newSection: ProfileSectionType = {
                                    id: "temp-new",
                                    title: "",
                                    type: "text",
                                    items: [],
                                };
                                openEditModal("section", newSection, "add");
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" /> Add Section
                        </Button>
                    )}

                    {/* Edit buttons */}
                    {editable && (
                        <div className="mt-6 flex justify-end space-x-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="sm" variant="outline" onClick={handleReset} className="flex items-center">
                                        Reset
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reset to original profile</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="sm"
                                        onClick={handleSave}
                                        className="flex items-center"
                                        variant={saveSuccess ? "outline" : "default"}
                                    >
                                        {saveSuccess ? (
                                            <>
                                                <Check className="h-4 w-4 mr-2" /> Saved
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4 mr-2" /> Save
                                            </>
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Save changes</TooltipContent>
                            </Tooltip>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editAction === "edit" ? "Edit" : "Add"}{" "}
                            {editType === "section" ? "Section" : editType === "experience" ? "Experience" : "Item"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Section editing */}
                        {editType === "section" && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="section-title">Section Title</Label>
                                    <Input
                                        id="section-title"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        placeholder="Enter section title"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Section Type</Label>
                                    <div className="flex space-x-4">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="radio"
                                                id="type-text"
                                                checked={editSectionType === "text"}
                                                onChange={() => setEditSectionType("text")}
                                            />
                                            <Label htmlFor="type-text">Text</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="radio"
                                                id="type-experience"
                                                checked={editSectionType === "experience"}
                                                onChange={() => setEditSectionType("experience")}
                                            />
                                            <Label htmlFor="type-experience">Experience</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="radio"
                                                id="type-keyValue"
                                                checked={editSectionType === "keyValue"}
                                                onChange={() => setEditSectionType("keyValue")}
                                            />
                                            <Label htmlFor="type-keyValue">Key-Value</Label>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="section-content">Content (Optional)</Label>
                                    <Textarea
                                        id="section-content"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        placeholder="Enter section content"
                                        rows={3}
                                    />
                                </div>
                            </>
                        )}

                        {/* Experience editing */}
                        {editType === "experience" && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="experience-company">Company</Label>
                                    <Input
                                        id="experience-company"
                                        value={editCompany}
                                        onChange={(e) => setEditCompany(e.target.value)}
                                        placeholder="Enter company name"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="experience-title">Title/Position</Label>
                                    <Input
                                        id="experience-title"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        placeholder="Enter job title"
                                    />
                                </div>
                            </>
                        )}

                        {/* Item editing */}
                        {editType === "item" && (
                            <div className="space-y-2">
                                <Label htmlFor="item-content">Content</Label>
                                <Textarea
                                    id="item-content"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    placeholder="Enter item content"
                                    rows={4}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Use ** around text to highlight important information. Example: This is **highlighted** text.
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditSave}>{editAction === "edit" ? "Save" : "Add"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
};

export default CandidateProfile;
