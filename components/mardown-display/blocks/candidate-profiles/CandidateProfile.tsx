// Main Component File: CandidateProfile.jsx
'use client'

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Plus, Check, Save } from "lucide-react";
import {
    CandidateProfileType,
    ProfileSectionType,
    ExperienceItemType,
    ProfileItemType,
    parseMarkdownProfile,
} from "./parseMarkdownProfile";

import dynamic from "next/dynamic";

// Dynamically import ReactMarkdown and remarkGfm
const ReactMarkdown = dynamic(() => import("react-markdown"), {
  loading: () => <p>Loading...</p>,
  ssr: false
});

import remarkGfm from "remark-gfm";


// Import sub-components (defined below)
import ProfileSection from "./parts/ProfileSection";
import EditModal from "./parts/EditModal";  
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
      console.log("parsedProfile", parsedProfile);
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
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    if (onSave) {
      onSave(JSON.stringify(profile));
    }
  };

  if (!profile) return <div>Loading profile...</div>;

  return (
    <TooltipProvider>
      <Card className="max-w-3xl border-none bg-inherit">
        <CardHeader className="pb-4">
          <div className="flex flex-col space-y-2">
            <CardTitle className="text-xl font-bold">
              Candidate: <span className="text-primary">{profile.name}</span>
            </CardTitle>
            {profile.subtitle && (
              <div className="text-muted-foreground text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {profile.subtitle}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-8 pt-2">
          {profile.sections.map((section) => (
            <ProfileSection 
              key={section.id}
              section={section}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
              openEditModal={openEditModal}
              deleteItem={deleteItem}
              editable={editable}
            />
          ))}

          {/* Add new section button */}
          {editable && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-6"
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
            <div className="mt-8 flex justify-end space-x-2">
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
      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editType={editType}
        editAction={editAction}
        editTitle={editTitle}
        editValue={editValue}
        editCompany={editCompany}
        editSectionType={editSectionType}
        setEditTitle={setEditTitle}
        setEditValue={setEditValue}
        setEditCompany={setEditCompany}
        setEditSectionType={setEditSectionType}
        onSave={handleEditSave}
      />
    </TooltipProvider>
  );
};

export default CandidateProfile;