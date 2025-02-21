import { TabSearchConfig } from "./components/field-components/types";
import { TabConfig } from "./components/header/HeaderTabs";

export const tabConfig: TabConfig[] = [
    { value: "stays", label: "Stays" },
    { value: "vegas-nightlife", label: "Vegas Nightlife" },
    { value: "restaurants", label: "Restaurants" },
    { value: "activities", label: "Activities" },
    { value: "shopping", label: "Shopping" },
    { value: "transportation", label: "Transportation" },
    { value: "events", label: "Events" },
];

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
                        subtitle: "How many beds do you need?",
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
                        subtitle: "Ages 13 or above",
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
                        subtitle: "Ages 2 – 12",
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
                        width: "w-full mb-4",
                        subtitle: "Under 2",
                    },
                },
                {
                    brokerId: "d58dffe2-cab7-4292-b4b8-27b7c34bfb32",
                    label: "Pets",
                    placeholder: "Select number of pets",
                    type: "number",
                    customConfig: {
                        min: 0,
                        max: 10,
                        width: "w-full",
                        subtitle: "Service animals always welcome",
                        helpText: "Bringing a service animal?",
                    },
                },
            ],
        },
    ],
    "vegas-nightlife": [
        {
            id: "venue-type",
            label: "Venue Type",
            placeholder: "Select venue type",
            fields: [
                {
                    brokerId: "d58dffe2-cab7-4292-b4b8-27b7c34bfb32",
                    label: "Venue Type",
                    type: "checkbox",
                    placeholder: "Select venue type",
                    customConfig: {
                        options: [
                            { id: "club", label: "Nightclub", value: "club" },
                            { id: "bar", label: "Bar/Lounge", value: "bar" },
                            { id: "pool", label: "Pool Party", value: "pool" },
                            { id: "show", label: "Show/Performance", value: "show" },
                        ],
                        includeOther: true,
                        otherPlaceholder: "Enter other venue type...",
                        width: "w-full",
                    },
                },
            ],
        },
        {
            id: "date-time",
            label: "Date & Time",
            placeholder: "Select date and time",
            fields: [
                {
                    brokerId: "3c32a4e9-8f45-4d21-a23d-1a9e9c6e0f76",
                    label: "Date",
                    placeholder: "Select date",
                    type: "date",
                    customConfig: {
                        width: "w-full mb-4",
                    },
                },
                {
                    brokerId: "7d9e5f2a-1c8b-4b35-8e7a-9e0d3f2c1a8b",
                    label: "Time Range",
                    placeholder: "Select time range",
                    type: "slider",
                    customConfig: {
                        min: 18,
                        max: 4,
                        step: 1,
                        range: true,
                        showMarks: true,
                        showMinMaxLabels: true,
                        minLabel: "6 PM",
                        maxLabel: "4 AM",
                        valueSuffix: ":00",
                        width: "w-full",
                    },
                },
            ],
        },
        {
            id: "budget",
            label: "Budget",
            placeholder: "Set your budget",
            fields: [
                {
                    brokerId: "5e9a7d2c-3b1f-4d8e-9c7a-1b5f8d2e3a4c",
                    label: "Price Range",
                    placeholder: "Select price range",
                    type: "slider",
                    customConfig: {
                        min: 0,
                        max: 500,
                        step: 50,
                        showInput: true,
                        valuePrefix: "$",
                        width: "w-full",
                    },
                },
                {
                    brokerId: "2b8c9d7e-5f4a-1e9d-8c7b-6a5f4e3d2c1b",
                    label: "Include Bottle Service",
                    placeholder: "Include bottle service?",
                    type: "radio",
                    customConfig: {
                        options: [
                            { id: "yes", label: "Yes", value: "yes" },
                            { id: "no", label: "No", value: "no" },
                        ],
                        width: "w-full",
                    },
                },
            ],
        },
    ],
    restaurants: [
        {
            id: "cuisine",
            label: "Cuisine",
            placeholder: "Select cuisine",
            fields: [
                {
                    brokerId: "0fc49b4c-fc8b-467e-9dda-f43dedf74a9d",
                    label: "Cuisine Type",
                    type: "multiselect",
                    placeholder: "Select cuisine types",
                    customConfig: {
                        options: [
                            { value: "italian", label: "Italian" },
                            { value: "japanese", label: "Japanese" },
                            { value: "mexican", label: "Mexican" },
                            { value: "american", label: "American" },
                            { value: "chinese", label: "Chinese" },
                            { value: "indian", label: "Indian" },
                            { value: "thai", label: "Thai" },
                            { value: "french", label: "French" },
                            { value: "mediterranean", label: "Mediterranean" },
                            { value: "vegan", label: "Vegan" },
                        ],
                        showSearch: true,
                        searchPlaceholder: "Search cuisines...",
                        showSelectAll: true,
                        allowClear: true,
                        maxItems: 5,
                        width: "w-full",
                    },
                },
            ],
        },
        {
            id: "dietary",
            label: "Dietary Preferences",
            placeholder: "Select dietary preferences",
            fields: [
                {
                    brokerId: "7a9c6d5e-3b2a-1c9d-8e7f-4a5b6c7d8e9f",
                    label: "Dietary Restrictions",
                    type: "checkbox",
                    placeholder: "Select dietary restrictions",
                    customConfig: {
                        options: [
                            { id: "vegetarian", label: "Vegetarian", value: "vegetarian" },
                            { id: "vegan", label: "Vegan", value: "vegan" },
                            { id: "gluten-free", label: "Gluten-Free", value: "gluten-free" },
                            { id: "dairy-free", label: "Dairy-Free", value: "dairy-free" },
                            { id: "nut-free", label: "Nut-Free", value: "nut-free" },
                        ],
                        direction: "vertical",
                        width: "w-full",
                    },
                },
            ],
        },
        {
            id: "price-range",
            label: "Price Range",
            placeholder: "Select price range",
            fields: [
                {
                    brokerId: "3e2d1c9b-8a7f-6e5d-4c3b-2a1d9e8f7c6b",
                    label: "Price Level",
                    type: "radio",
                    placeholder: "Select price level",
                    customConfig: {
                        options: [
                            { id: "inexpensive", label: "$ (Inexpensive)", value: "$", description: "Under $15 per person" },
                            { id: "moderate", label: "$$ (Moderate)", value: "$$", description: "$15-$30 per person" },
                            { id: "expensive", label: "$$$ (Expensive)", value: "$$$", description: "$31-$50 per person" },
                            { id: "very-expensive", label: "$$$$ (Very Expensive)", value: "$$$$", description: "Over $50 per person" },
                        ],
                        width: "w-full",
                    },
                },
            ],
        },
    ],
    activities: [
        {
            id: "activity-type",
            label: "Activity Type",
            placeholder: "Select activity types",
            fields: [
                {
                    brokerId: "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
                    label: "Activity Categories",
                    type: "checkbox",
                    placeholder: "Select categories",
                    customConfig: {
                        options: [
                            { id: "outdoor", label: "Outdoor Adventures", value: "outdoor" },
                            { id: "cultural", label: "Cultural Experiences", value: "cultural" },
                            { id: "water", label: "Water Activities", value: "water" },
                            { id: "family", label: "Family Friendly", value: "family" },
                            { id: "tours", label: "Guided Tours", value: "tours" },
                            { id: "wellness", label: "Wellness & Spa", value: "wellness" },
                        ],
                        direction: "vertical",
                        includeOther: true,
                        width: "w-full",
                    },
                },
            ],
        },
        {
            id: "duration",
            label: "Duration",
            placeholder: "Select activity duration",
            fields: [
                {
                    brokerId: "9p8o7n6m-5l4k-3j2i-1h0g-9f8e7d6c5b4a",
                    label: "Activity Length",
                    type: "radio",
                    placeholder: "Select duration",
                    customConfig: {
                        options: [
                            { id: "few-hours", label: "A few hours", value: "few-hours" },
                            { id: "half-day", label: "Half day", value: "half-day" },
                            { id: "full-day", label: "Full day", value: "full-day" },
                            { id: "multi-day", label: "Multi-day", value: "multi-day" },
                        ],
                        width: "w-full",
                    },
                },
            ],
        },
        {
            id: "price-range",
            label: "Price Range",
            placeholder: "Select price range",
            fields: [
                {
                    brokerId: "3d4e5f6g-7h8i-9j0k-1l2m-3n4o5p6q7r8s",
                    label: "Budget",
                    type: "slider",
                    placeholder: "Set your budget",
                    customConfig: {
                        min: 0,
                        max: 1000,
                        step: 50,
                        showInput: true,
                        valuePrefix: "$",
                        width: "w-full",
                    },
                },
            ],
        },
        {
            id: "physical-level",
            label: "Physical Level",
            placeholder: "Select physical intensity level",
            fields: [
                {
                    brokerId: "8s7r6q5p-4o3n-2m1l-0k9j-8i7h6g5f4e3d",
                    label: "Activity Intensity",
                    type: "slider",
                    placeholder: "Select intensity level",
                    customConfig: {
                        min: 1,
                        max: 5,
                        step: 1,
                        showMarks: true,
                        markCount: 5,
                        minLabel: "Easy",
                        maxLabel: "Challenging",
                        width: "w-full",
                    },
                },
            ],
        },
    ],
    shopping: [
        {
            id: "category",
            label: "Shopping Category",
            placeholder: "Select shopping categories",
            fields: [
                {
                    brokerId: "1q2w3e4r-5t6y-7u8i-9o0p-1a2s3d4f5g6h",
                    label: "Categories",
                    type: "multiselect",
                    placeholder: "Select shopping categories",
                    customConfig: {
                        options: [
                            { value: "fashion", label: "Fashion & Clothing" },
                            { value: "electronics", label: "Electronics" },
                            { value: "home", label: "Home & Decor" },
                            { value: "beauty", label: "Beauty & Cosmetics" },
                            { value: "books", label: "Books & Stationery" },
                            { value: "jewelry", label: "Jewelry & Accessories" },
                            { value: "sports", label: "Sports & Outdoors" },
                            { value: "toys", label: "Toys & Games" },
                            { value: "food", label: "Specialty Food" },
                            { value: "art", label: "Art & Crafts" },
                        ],
                        showSearch: true,
                        createNewOption: true,
                        width: "w-full",
                    },
                },
            ],
        },
        {
            id: "location-type",
            label: "Shopping Venue",
            placeholder: "Select shopping venue type",
            fields: [
                {
                    brokerId: "7h6g5f4d-3s2a-1p0o-9i8u-7y6t5r4e3w2q",
                    label: "Venue Type",
                    type: "checkbox",
                    placeholder: "Select venue types",
                    customConfig: {
                        options: [
                            { id: "mall", label: "Shopping Mall", value: "mall" },
                            { id: "street", label: "Street Shopping", value: "street" },
                            { id: "boutique", label: "Boutique Stores", value: "boutique" },
                            { id: "market", label: "Markets & Bazaars", value: "market" },
                            { id: "outlet", label: "Outlet Centers", value: "outlet" },
                            { id: "department", label: "Department Stores", value: "department" },
                        ],
                        direction: "horizontal",
                        width: "w-full",
                    },
                },
            ],
        },
        {
            id: "price-range",
            label: "Price Range",
            placeholder: "Select price range",
            fields: [
                {
                    brokerId: "2q3w4e5r-6t7y-8u9i-0o1p-2a3s4d5f6g7h",
                    label: "Budget",
                    type: "radio",
                    placeholder: "Select price level",
                    customConfig: {
                        options: [
                            { id: "budget", label: "Budget Friendly", value: "budget" },
                            { id: "mid-range", label: "Mid-Range", value: "mid-range" },
                            { id: "high-end", label: "High-End", value: "high-end" },
                            { id: "luxury", label: "Luxury", value: "luxury" },
                        ],
                        width: "w-full",
                    },
                },
            ],
        },
    ],
    transportation: [
        {
            id: "transport-type",
            label: "Transportation Type",
            placeholder: "Select transportation method",
            fields: [
                {
                    brokerId: "1a2s3d4f-5g6h-7j8k-9l0z-1x2c3v4b5n6m",
                    label: "Transport Method",
                    type: "radio",
                    placeholder: "Select method",
                    customConfig: {
                        options: [
                            { id: "car-rental", label: "Car Rental", value: "car-rental" },
                            { id: "rideshare", label: "Rideshare (Uber/Lyft)", value: "rideshare" },
                            { id: "taxi", label: "Taxi", value: "taxi" },
                            { id: "public", label: "Public Transportation", value: "public" },
                            { id: "shuttle", label: "Airport Shuttle", value: "shuttle" },
                            { id: "private", label: "Private Transfer", value: "private" },
                        ],
                        direction: "vertical",
                        width: "w-full",
                    },
                },
            ],
        },
        {
            id: "passengers",
            label: "Passengers",
            placeholder: "Number of passengers",
            fields: [
                {
                    brokerId: "6m7n8b9v-0c1x-2z3l-4k5j-6h7g8f9d0s1a",
                    label: "Adults",
                    type: "number",
                    placeholder: "Number of adults",
                    customConfig: {
                        min: 1,
                        max: 12,
                        subtitle: "Ages 13 or above",
                        width: "w-full mb-4",
                    },
                },
                {
                    brokerId: "2a3s4d5f-6g7h-8j9k-0l1z-2x3c4v5b6n7m",
                    label: "Children",
                    type: "number",
                    placeholder: "Number of children",
                    customConfig: {
                        min: 0,
                        max: 12,
                        subtitle: "Ages 2 – 12",
                        width: "w-full mb-4",
                    },
                },
                {
                    brokerId: "8m9n0b1v-2c3x-4z5l-6k7j-8h9g0f1d2s3a",
                    label: "Luggage",
                    type: "number",
                    placeholder: "Number of luggage pieces",
                    customConfig: {
                        min: 0,
                        max: 20,
                        width: "w-full",
                    },
                },
            ],
        },
        {
            id: "preferences",
            label: "Vehicle Preferences",
            placeholder: "Select vehicle preferences",
            fields: [
                {
                    brokerId: "4a5s6d7f-8g9h-0j1k-2l3z-4x5c6v7b8n9m",
                    label: "Vehicle Size",
                    type: "radio",
                    placeholder: "Select vehicle size",
                    customConfig: {
                        options: [
                            { id: "economy", label: "Economy", value: "economy", description: "Small, fuel-efficient car" },
                            { id: "midsize", label: "Midsize", value: "midsize", description: "Comfortable sedan or small SUV" },
                            { id: "suv", label: "SUV", value: "suv", description: "Large vehicle with extra space" },
                            { id: "luxury", label: "Luxury", value: "luxury", description: "Premium vehicle with amenities" },
                        ],
                        width: "w-full",
                    },
                },
                {
                    brokerId: "0m1n2b3v-4c5x-6z7l-8k9j-0h1g2f3d4s5a",
                    label: "Additional Features",
                    type: "checkbox",
                    placeholder: "Select features",
                    customConfig: {
                        options: [
                            { id: "gps", label: "GPS Navigation", value: "gps" },
                            { id: "auto", label: "Automatic Transmission", value: "auto" },
                            { id: "child-seat", label: "Child Seat", value: "child-seat" },
                            { id: "wifi", label: "WiFi", value: "wifi" },
                            { id: "unlimited-miles", label: "Unlimited Mileage", value: "unlimited-miles" },
                        ],
                        direction: "vertical",
                        width: "w-full",
                    },
                },
            ],
        },
    ],
    events: [
        {
            id: "event-type",
            label: "Event Type",
            placeholder: "Select event type",
            fields: [
                {
                    brokerId: "1q2w3e4r-5t6y-7u8i-9o0p-1a2s3d4f5g6h",
                    label: "Event Categories",
                    type: "multiselect",
                    placeholder: "Select event categories",
                    customConfig: {
                        options: [
                            { value: "concert", label: "Concerts & Music" },
                            { value: "sports", label: "Sports Events" },
                            { value: "theater", label: "Theater & Performing Arts" },
                            { value: "festival", label: "Festivals & Fairs" },
                            { value: "conference", label: "Conferences & Conventions" },
                            { value: "exhibition", label: "Exhibitions & Expos" },
                            { value: "comedy", label: "Comedy Shows" },
                            { value: "nightlife", label: "Nightlife Events" },
                        ],
                        showSearch: true,
                        maxItems: 5,
                        width: "w-full",
                    },
                },
            ],
        },
        {
            id: "dates",
            label: "Date Range",
            placeholder: "Select date range",
            fields: [
                {
                    brokerId: "7h6g5f4d-3s2a-1p0o-9i8u-7y6t5r4e3w2q",
                    label: "Start Date",
                    type: "date",
                    placeholder: "Select start date",
                    customConfig: {
                        width: "w-full mb-4",
                    },
                },
                {
                    brokerId: "2q3w4e5r-6t7y-8u9i-0o1p-2a3s4d5f6g7h",
                    label: "End Date",
                    type: "date",
                    placeholder: "Select end date",
                    customConfig: {
                        width: "w-full",
                    },
                },
            ],
        },
        {
            id: "price",
            label: "Ticket Price",
            placeholder: "Select ticket price range",
            fields: [
                {
                    brokerId: "3d4e5f6g-7h8i-9j0k-1l2m-3n4o5p6q7r8s",
                    label: "Price Range",
                    type: "slider",
                    placeholder: "Set ticket price range",
                    customConfig: {
                        min: 0,
                        max: 500,
                        step: 25,
                        range: true,
                        showInput: true,
                        valuePrefix: "$",
                        width: "w-full",
                    },
                },
            ],
        },
        {
            id: "people",
            label: "Number of People",
            placeholder: "Number of attendees",
            fields: [
                {
                    brokerId: "8s7r6q5p-4o3n-2m1l-0k9j-8i7h6g5f4e3d",
                    label: "Tickets",
                    type: "number",
                    placeholder: "Number of tickets",
                    customConfig: {
                        min: 1,
                        max: 20,
                        subtitle: "How many people are attending?",
                        width: "w-full",
                    },
                },
            ],
        },
    ],
};

export const ALL_BROKER_IDS = [
    "id:25a94523-132b-44be-be15-c487a5f6c921",
    "id:6d9e856e-027e-4e8e-89c2-b03fd5f3485e",
    "id:9ef213ad-9c90-4a97-a6cd-7bcef2882e9e",
    "id:26e49411-3df9-443f-951f-0000d658041b",
    "id:3a5fde7c-bd88-4b05-b635-85ab2cc024a8",
    "id:88b23240-2185-4bf4-8a53-0884f025ae99",
    "id:0fc49b4c-fc8b-467e-9dda-f43dedf74a9d",
    "id:9dea5382-93f5-4b01-8387-b30500aee8e7",
    "id:d58dffe2-cab7-4292-b4b8-27b7c34bfb32",
    "id:c3c1fbe0-45c5-4f9a-bc39-3c0a1cf84f71",
];

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
