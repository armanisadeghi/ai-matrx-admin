"use client";
import React, { useState } from "react";
import { User } from "lucide-react";
import CandidateProfile from "./CandidateProfile";
import { useToast } from "@/components/ui/use-toast";
import ChatCollapsibleWrapper from "@/components/mardown-display/blocks/ChatCollapsibleWrapper";

interface CandidateProfileBlockProps {
    content: string;
}

const CandidateProfileBlock: React.FC<CandidateProfileBlockProps> = ({ content }) => {
    const [profileContent, setProfileContent] = useState(content);
    const { toast } = useToast();

    const handleSaveProfile = (updatedContent: string) => {
        setProfileContent(updatedContent);
        toast({
            title: "Profile saved",
            description: "The candidate profile has been updated successfully",
        });
    };

    return (
        <ChatCollapsibleWrapper
            icon={<User className="h-4 w-4 text-primary" />}
            title="Candidate Profile"
        >
            <CandidateProfile
                content={profileContent}
                onSave={handleSaveProfile}
                editable={true}
            />
        </ChatCollapsibleWrapper>
    );
};

export default CandidateProfileBlock;