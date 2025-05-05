// config.ts

import { ModulePage } from "@/components/matrx/navigation/types";

export const pages: ModulePage[] = [
    {
        title: "Complex Component Config Builder",
        path: "component-config-builder",
        relative: true,
        description: "This is the complex potential start for what a component config builder could look like.",
    },
    {
        title: "Layout Options Demo",
        path: "layout-options-demo",
        relative: true,
        description: "This is a demo of the different layout options that are available for an applet.",
    },
    {
        title: "Applet Builder 3",
        path: "applet-builder-3",
        relative: true,
        description: "This is a really GREAT conceptual view of what an applet builder could be like. There is no real logic, but a nice framework for a potential UI",
    },
    {
        title: "Applet Builder 2",
        path: "applet-builder-2",
        relative: true,
        description: "Old concept. Probably useless.",
    },
    {
        title: "Resume Builder Stepper",
        path: "applet-build-stepper/resume-builder-test",
        relative: true,
        description: "This is designed to be an example of what an applet could build, as an example everyone can relate with.",
    },
    {
        title: "Applet Build Stepper",
        path: "applet-build-stepper",
        relative: true,
        description: "",
    },

    {
        title: "Input Components 4 (With Layout)",
        path: "input-components-4",
        relative: true,
        description: "Airbnb Inspired Broker Input Components",
    },
    {
        title: "Multi Broker ValueTest 2",
        path: "value-broker-test/multi-broker-test-2",
        relative: true,
        description: "Test Changing multiple broker values at once",
    },
    {
        title: "Multi Broker ValueTest",
        path: "value-broker-test/multi-broker-test",
        relative: true,
        description: "Test Changing multiple broker values at once",
    },
    {
        title: "Broker Value Test",
        path: "value-broker-test",
        relative: true,
        description: "Small test to see if the new broker value hook works properly",
    },
    {
        title: "Input Components 3 (Configurable)",
        path: "input-components-3",
        relative: true,
        description:
            "This is the hard-coded version that is still good for seeing some color options as well as a few features that are not in the main version.",
    },
    {
        title: "Input Components 2",
        path: "input-components-2",
        relative: true,
        description: "Airbnb Inspired Broker Input Components",
    },
];

export const filteredPages = pages.filter((page) => page.path !== "link-here");

export const MODULE_HOME = "/tests/applet-tests";
export const MODULE_NAME = "Applet Tests";
