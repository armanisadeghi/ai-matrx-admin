// config.ts

import { ModulePage } from "@/components/matrx/navigation/types";

export const pages: ModulePage[] = [
    {
        title: "Applet Builder 3",
        path: "applet-builder-3",
        relative: true,
        description: "This is a really GREAT conceptual view of what an applet builder could be like. There is no real logic, but a nice framework for a potential UI",
    },
    
    
    {
        title: "Applet Build Stepper",
        path: "applet-build-stepper",
        relative: true,
        description: "A beautiful concept for a simplified builder, possibly when you already have fields or if we create automated parts.",
    },
    {
        title: "Resume Builder Stepper",
        path: "resume-builder-test",
        relative: true,
        description: "Great example of something we should be able to build with our dynamic applet builder. Possibly by creating a little form builder that is simpified or allows for easy to use blocks. I also really like the idea of icons for steps.",
    },
    {
        title: "Input Components 3 (Configurable)",
        path: "input-components-3",
        relative: true,
        description:
            "This is the hard-coded version that is still good for seeing some color options as well as a few features that are not in the main version.",
    },
    {
        title: "Color Tester",
        path: "color-tester",
        relative: true,
        description: "ADDED DURING REVIEW",
    },

];

export const filteredPages = pages.filter((page) => page.path !== "link-here");

export const MODULE_HOME = "/tests/applet-tests";
export const MODULE_NAME = "Applet Tests";
