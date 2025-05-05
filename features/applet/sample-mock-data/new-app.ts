const appTravelTwinConfig = {
    id: "f4ad1440-f796-4714-b6df-ffb5b1dd75db",
    name: "TravelTwin",
    description:
        "TravelTwin is your ultimate travel companion, utilizing AI-driven insights to match you with the perfect destinations, activities, and experiences. By understanding your passions and interests, our app crafts customized travel plans that exceed your expectations. Say goodbye to generic recommendations and hello to authentic, memorable adventures with TravelTwin.",
    slug: "travel-twin",
    mainAppIcon: "AppWindowIcon",
    mainAppSubmitIcon: "CheckIcon",
    creator: "Armani Sadeghi",
    primaryColor: "blue",
    accentColor: "pink",
    layoutType: "oneColumn",
    appletList: [{ id: "1682ef06-c470-416a-b5ea-e03a9f7f29c0", name: "BeachBloom" }],
    extraButtons: [],
    imageUrl: null,
};

const containersBeachBloomConfig = [
    {
        id: "cae4fd0d-f48c-47ab-98b8-deb9ad168cc6",
        label: "Personal Info",
        shortLabel: "Personal",
        description: "Provide personal info",
        hideDescription: false,
        helpText: "",
        fields: [
            {
                id: "d8f2f4f2-136d-4bb0-a60d-959c1fd32552",
                label: "First Name",
                description: "Please enter your first name",
                group: "default",
                component: "input",
                required: true,
                disabled: false,
                placeholder: "Enter name...",
                options: [],
                componentProps: {
                    min: 0,
                    max: 100,
                    step: 1,
                    rows: 3,
                    minDate: "",
                    maxDate: "",
                    onLabel: "Yes",
                    offLabel: "No",
                },
            },
            {
                id: "209caf15-34ec-4a19-90ca-e9047d411570",
                label: "Age Range",
                description: "What is the average age range of the travelers",
                group: "default",
                component: "radio",
                required: true,
                disabled: false,
                placeholder: "Enter value here",
                options: [
                    {
                        id: "a2e79de5-8bc0-4248-ac7e-964890eacf73",
                        label: "Under 21",
                        helpText: "",
                        description: "Mostly 21 or under",
                    },
                    {
                        id: "e415fd56-2017-4e2c-97d4-3aee815883eb",
                        label: "21-24",
                        helpText: "",
                        description: "",
                    },
                    {
                        id: "7a0634bc-28c9-4a65-8080-e99514f7e6e0",
                        label: "25-29",
                        helpText: "",
                        description: "",
                    },
                    {
                        id: "3e39b34f-1ca5-4604-9d00-41e19dd82764",
                        label: "30-39",
                        helpText: "",
                        description: "",
                    },
                    {
                        id: "ac03c587-9baf-42c5-b6d8-93f4b22acdc6",
                        label: "40+",
                        helpText: "",
                        description: "",
                    },
                ],
                componentProps: {
                    min: 0,
                    max: 100,
                    step: 1,
                    rows: 3,
                    minDate: "",
                    maxDate: "",
                    onLabel: "Yes",
                    offLabel: "No",
                },
            },
        ],
    },
];

const appletBeachBloomConfig = {
    id: "1682ef06-c470-416a-b5ea-e03a9f7f29c0",
    name: "BeachBloom",
    description:
        "BeachBloom is your go-to destination for stress-free beach vacation planning. Our AI-driven platform takes the guesswork out of finding the perfect beach getaway, considering factors like your interests, budget, and preferences. From secluded hideaways to vibrant beach towns, BeachBloom delivers a tailored beach experience that's as unique as you are.",
    slug: "beach-bloom",
    appletIcon: "TreePalm",
    creator: "Armani Sadeghi",
    primaryColor: "emerald",
    accentColor: "blue",
    layoutType: "flat",
    containers: [containersBeachBloomConfig],
    compiledRecipeId: "94e378c3-b55b-4193-8ba9-d64f34a3d9b2",
    imageUrl:
        "https://images.unsplash.com/photo-1738762827470-6caf6caee4b3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w2NjE4MDZ8MHwxfHNlYXJjaHwyfHxib3JhJTIwYm9yYXxlbnwwfHwyfHwxNzQ2MDU3OTg5fDI&ixlib=rb-4.0.3&q=85",
};

export { appTravelTwinConfig, appletBeachBloomConfig };
