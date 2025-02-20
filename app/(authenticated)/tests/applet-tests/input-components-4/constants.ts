import { TabSearchConfig } from "./components/field-components/types";



export const searchConfig: TabSearchConfig = {
    stays: [
        {
            id: "rooms",
            label: "Room Options",
            placeholder: "Select room options",
            fields: [
                {
                    brokerId: "25a94523-132b-44be-be15-c487a5f6c921",
                    label: "Beds",
                    placeholder: "Select number of beds",
                    type: "number",
                    customConfig: {
                        min: 1,
                        max: 3,
                    },
                },
                {
                    brokerId: "6d9e856e-027e-4e8e-89c2-b03fd5f3485e",
                    label: "Room Type",
                    placeholder: "Select room type",
                    type: "select",
                    customConfig: {
                        options: [
                            { value: "single", label: "Single" },
                            { value: "double", label: "Double" },
                            { value: "suite", label: "Suite" },
                        ],
                    },
                },
                {
                    brokerId: "9ef213ad-9c90-4a97-a6cd-7bcef2882e9e",
                    label: "Special Requests",
                    placeholder: "Enter special requests",
                    type: "textarea",
                    customConfig: {
                        rows: 3,
                    },
                },
            ],
        },
        {
            id: "location",
            label: "Location",
            placeholder: "Where are you going?",
            fields: [
                {
                    brokerId: "2ff8a2ca-3b89-410d-bfd1-46449c84e30b",
                    label: "Location",
                    placeholder: "Select location",
                    type: "select",
                    customConfig: {
                        options: [
                            { value: "losAngeles", label: "Los Angeles" },
                            { value: "sanDiego", label: "San Diego" },
                            { value: "sanFrancisco", label: "San Francisco" },
                            { value: "other", label: "Other (Enter Below)" },
                        ],
                        width: "w-full",
                    },
                },
            ],
        },
        {
            id: "dates",
            label: "Dates",
            placeholder: "Add dates",
            fields: [
                {
                    brokerId: "3a5fde7c-bd88-4b05-b635-85ab2cc024a8",
                    label: "Check-In Date",
                    placeholder: "Select check-in date",
                    type: "date",
                    customConfig: {
                        width: "w-full mb-4",
                    },
                },
                {
                    brokerId: "88b23240-2185-4bf4-8a53-0884f025ae99",
                    label: "Check-Out Date",
                    placeholder: "Select check-out date",
                    type: "date",
                    customConfig: {
                        width: "w-full",
                    },
                },
            ],
        },
        {
            id: "guests",
            label: "Guests",
            placeholder: "Add guests",
            fields: [
                {
                    brokerId: "c3c1fbe0-45c5-4f9a-bc39-3c0a1cf84f71",
                    label: "Adults",
                    placeholder: "Select number of adults",
                    type: "number",
                    customConfig: {
                        min: 1,
                        max: 10,
                        width: "w-full mb-4",
                    },
                },
                {
                    brokerId: "9dea5382-93f5-4b01-8387-b30500aee8e7",
                    label: "Children",
                    placeholder: "Select number of children",
                    type: "number",
                    customConfig: {
                        min: 0,
                        max: 10,
                        width: "w-full mb-4",
                    },
                },
                {
                    brokerId: "26e49411-3df9-443f-951f-0000d658041b",
                    label: "Infants",
                    placeholder: "Select number of infants",
                    type: "number",
                    customConfig: {
                        min: 0,
                        max: 10,
                        width: "w-full",
                    },
                },
            ],
        },
    ],
    "vegas-nightlife": [
        // Vegas nightlife search groups would go here
        {
            id: "venue-type",
            label: "Venue Type",
            placeholder: "Select venue type",
            fields: [
                {
                    brokerId: "2fbca494-474e-44a1-b3d8-60b81a1d8050",
                    label: "Venue Type",
                    type: "select",
                    placeholder: "Select venue type",
                    customConfig: {
                        options: [
                            { value: "club", label: "Nightclub" },
                            { value: "bar", label: "Bar/Lounge" },
                            { value: "pool", label: "Pool Party" },
                            { value: "show", label: "Show/Performance" },
                        ],
                        width: "w-full",
                    },
                },
            ],
        },
        // Other Vegas nightlife groups...
    ],
    restaurants: [
        // Restaurant search groups...
        {
            id: "cuisine",
            label: "Cuisine",
            placeholder: "Select cuisine",
            fields: [
                {
                    brokerId: "3b040013-17d4-4f47-b751-e0f45bd94f75",
                    label: "Cuisine Type",
                    type: "select",
                    placeholder: "Select cuisine",
                    customConfig: {
                        options: [
                            { value: "italian", label: "Italian" },
                            { value: "japanese", label: "Japanese" },
                            { value: "mexican", label: "Mexican" },
                            { value: "american", label: "American" },
                        ],
                        width: "w-full",
                    },
                },
            ],
        },
        // Other restaurant groups...
    ],
    // ... other tabs
};

export const ALL_BROKER_IDS = [
    "id:25a94523-132b-44be-be15-c487a5f6c921",
    "id:6d9e856e-027e-4e8e-89c2-b03fd5f3485e",
    "id:9ef213ad-9c90-4a97-a6cd-7bcef2882e9e",
    "id:26e49411-3df9-443f-951f-0000d658041b",
    "id:3a5fde7c-bd88-4b05-b635-85ab2cc024a8",
    "id:88b23240-2185-4bf4-8a53-0884f025ae99",
    "id:3b040013-17d4-4f47-b751-e0f45bd94f75",
    "id:9dea5382-93f5-4b01-8387-b30500aee8e7",
    "id:2fbca494-474e-44a1-b3d8-60b81a1d8050",
    "id:c3c1fbe0-45c5-4f9a-bc39-3c0a1cf84f71",
]




// type GroupFieldConfig = {
//     brokerId: string;
//     label: string;
//     placeholder: string;
//     type: string;
//     customConfig: any;
// };

// const staysRoomsTabConfig: GroupFieldConfig[] = [
//     {
//         brokerId: "2a53fd15-acb5-42dc-9169-e79e6eb95eb4",
//         label: "Beds",
//         placeholder: "Select number of beds",
//         type: "number",
//         customConfig: {
//             min: 1,
//             max: 3,
//         },
//     },
//     {
//         brokerId: "2a9a3e13-1666-4e8d-bba8-780f93edada5",
//         label: "Room Type",
//         placeholder: "Select room type",
//         type: "select",
//         customConfig: {
//             options: [
//                 { value: "single", label: "Single" },
//                 { value: "double", label: "Double" },
//                 { value: "suite", label: "Suite" },
//             ],
//         },
//     },
//     {
//         brokerId: "2b286069-b531-4f85-ad3f-86c8576aff06",
//         label: "Special Requests",
//         placeholder: "Enter special requests",
//         type: "textarea",
//         customConfig: {
//             rows: 3,
//         },
//     },
// ];

// const staysLocationTabConfig: GroupFieldConfig[] = [
//     {
//         brokerId: "2a53fd15-acb5-42dc-9169-e79e6eb95eb4",
//         label: "Location",
//         placeholder: "Select location",
//         type: "select",
//         customConfig: {
//             options: [
//                 { value: "losAngeles", label: "Los Angeles" },
//                 { value: "sanDiego", label: "San Diego" },
//                 { value: "sanFrancisco", label: "San Francisco" },
//                 { value: "other", label: "Other (Enter Below)" },
//             ],
//         },
//     },
// ];

// const staysDateTabConfig: GroupFieldConfig[] = [
//     {
//         brokerId: "2a53fd15-acb5-42dc-9169-e79e6eb95eb4",
//         label: "Check-In Date",
//         placeholder: "Select check-in date",
//         type: "date",
//         customConfig: {},
//     },
//     {
//         brokerId: "2a53fd15-acb5-42dc-9169-e79e6eb95eb4",
//         label: "Check-Out Date",
//         placeholder: "Select check-out date",
//         type: "date",
//         customConfig: {},
//     },
// ];

// const staysGuestsConfig: GroupFieldConfig[] = [
//     {
//         brokerId: "2a53fd15-acb5-42dc-9169-e79e6eb95eb4",
//         label: "Adults",
//         placeholder: "Select number of adults",
//         type: "number",
//         customConfig: {
//             min: 1,
//             max: 10,
//         },
//     },
//     {
//         brokerId: "2a53fd15-acb5-42dc-9169-e79e6eb95eb4",
//         label: "Children",
//         placeholder: "Select number of children",
//         type: "number",
//         customConfig: {
//             min: 0,
//             max: 10,
//         },
//     },
//     {
//         brokerId: "2a53fd15-acb5-42dc-9169-e79e6eb95eb4",
//         label: "Infants",
//         placeholder: "Select number of infants",
//         type: "number",
//         customConfig: {
//             min: 0,
//             max: 10,
//         },
//     },
// ];

// type GroupConfig = {
//     tab: TabConfig;
//     fields: GroupFieldConfig[];
// };

// const tabConfig: TabConfig[] = [
//     { value: "stays", label: "Stays" },
//     { value: "vegas-nightlife", label: "Vegas Nightlife" },
//     { value: "restaurants", label: "Restaurants" },
//     { value: "activities", label: "Activities" },
//     { value: "shopping", label: "Shopping" },
//     { value: "transportation", label: "Transportation" },
//     { value: "events", label: "Events" },
// ];

// const staysGroupConfig: GroupConfig[] = [
//     {
//         tab: tabConfig[0],
//         fields: staysRoomsTabConfig,
//     },
//     {
//         tab: tabConfig[1],
//         fields: staysLocationTabConfig,
//     },
//     {
//         tab: tabConfig[2],
//         fields: staysDateTabConfig,
//     },
//     {
//         tab: tabConfig[3],
//         fields: staysGuestsConfig,
//     },
// ];
