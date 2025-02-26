import React, { useEffect, useState } from "react";
import { Button, Textarea } from "../components";
import { indexedDBStore } from "../utils/local-indexedDB";
import { TextInput } from "./Inputs";
import { IconCirclePlus } from "@tabler/icons-react";
import { generate } from "random-words";

const randomNouns = generate({ exactly: 2, join: "" });

export const CreateProject: React.FC<{ onProjectCreated: () => void }> = ({ onProjectCreated }) => {
    const [projectName, setProjectName] = useState("");
    const [projectDesc, setProjectDesc] = useState("");

    const handleCreateProject = async () => {
        if (!projectName) {
            // You might want to show an error message here
            return;
        }

        const newProject = {
            name: projectName,
            description: projectDesc,
            files: {},
        };

        try {
            await indexedDBStore.addRepository(newProject);
            setProjectName("");
            onProjectCreated();
        } catch (error) {
            console.error("Error creating project:", error);
            // You might want to show an error message to the user here
        }
    };

    useEffect(() => {
        setProjectName(randomNouns);
    }, [randomNouns]);

    return (
        <div className="space-y-4">
            <p className="text-lg font-semibold">Create a blank project</p>

            <div className="space-y-3">
                <TextInput
                    label="Title"
                    className="w-full"
                    placeholder="Enter project title"
                    defaultValue={projectName}
                    value={projectName}
                    onChange={(event) => setProjectName(event.currentTarget.value)}
                />
                <Textarea
                    label="Description"
                    className="w-full"
                    placeholder="Enter project description"
                    defaultValue={projectDesc}
                    value={projectDesc}
                    onChange={(event) => setProjectDesc(event.currentTarget.value)}
                />
                <Button onClick={handleCreateProject} variant="primary" leftSection={<IconCirclePlus size={16} />}>
                    Create Blank Project
                </Button>
            </div>
        </div>
    );
};
