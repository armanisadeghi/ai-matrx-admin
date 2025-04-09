'use client';

import TaskChecklist from "./TaskChecklist";
import { sampleContent } from "../sample-content";
import { useEffect } from "react";
import { useState } from "react";
export default function TasksForChat() {

    const [fullContent, setFullContent] = useState(sampleContent);
    const [taskContent, setTaskContent] = useState(sampleContent);

    useEffect(() => {
        setFullContent(sampleContent);
        setTaskContent(sampleContent.split("```tasks")[1].split("```")[0]);
    }, []);

    return <TaskChecklist markdown={taskContent} />;
}
