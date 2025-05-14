
type AppletContainerConfig = any;
type AppletFieldConfig = any;
type AppletContainersConfig = any
type GroupFieldConfig = any;
type AppletListItemConfig = any;
type AvailableAppletConfigs = any;
type CustomAppConfig = any;
type CustomActionButton = any;

const staysConfig: AppletContainersConfig[] = [
    {
        id: "rooms",
        label: "Room Options",
        placeholder: "Select room options",
        description: "Select the number of beds and room type",
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
                    helpText: "Need more beds or have additional needs to discuss?",
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
];

const nightlifeConfig: AppletContainersConfig[] = [
    {
        id: "venue-type",
        label: "Venue Type",
        placeholder: "Select venue type",
        fields: [
            {
                brokerId: "579b477f-5ca0-4831-8545-7b290ac8a59d",
                label: "Venue Type",
                type: "checkbox",
                placeholder: "Select venue type",
                customConfig: {
                    options: [
                        { id: "nightclub", label: "Nightclub", value: "nightclub" },
                        { id: "ultra-lounge", label: "Ultra Lounge", value: "ultra-lounge" },
                        { id: "speakeasy", label: "Speakeasy", value: "speakeasy" },
                        { id: "rooftop-bar", label: "Rooftop Bar", value: "rooftop-bar" },
                        { id: "pool-party", label: "Pool Party", value: "pool-party" },
                        { id: "dayclub", label: "Dayclub", value: "dayclub" },
                        { id: "strip-club", label: "Gentlemen's Club", value: "strip-club" },
                        { id: "live-music", label: "Live Music Venue", value: "live-music" },
                        { id: "concert-hall", label: "Concert Hall", value: "concert-hall" },
                        { id: "karaoke", label: "Karaoke Bar", value: "karaoke" },
                        { id: "burlesque", label: "Burlesque Show", value: "burlesque" },
                        { id: "magic-show", label: "Magic Show", value: "magic-show" },
                        { id: "comedy-club", label: "Comedy Club", value: "comedy-club" },
                        { id: "casino-lounge", label: "Casino Lounge", value: "casino-lounge" },
                        { id: "sports-bar", label: "Sports Bar", value: "sports-bar" },
                        { id: "hookah-lounge", label: "Hookah Lounge", value: "hookah-lounge" },
                        { id: "themed-bar", label: "Themed Bar", value: "themed-bar" },
                        { id: "after-hours", label: "After-Hours Club", value: "after-hours" },
                        { id: "vip-lounge", label: "VIP Lounge", value: "vip-lounge" },
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
                brokerId: "3a5fde7c-bd88-4b05-b635-85ab2cc024a8",
                label: "Date",
                placeholder: "Select date",
                type: "date",
                customConfig: {
                    width: "w-full mb-4",
                },
            },
            {
                brokerId: "88b23240-2185-4bf4-8a53-0884f025ae99",
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
                brokerId: "4b6315b3-680b-4e91-8cd5-8681b697c49c",
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
                brokerId: "53cc1193-58e5-43bb-b528-496d247fccff",
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
];

const restaurantsConfig: AppletContainersConfig[] = [
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
];

const activitiesConfig: AppletContainersConfig[] = [
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
];

const shoppingConfig: AppletContainersConfig[] = [
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
];

const transportConfig: AppletContainersConfig[] = [
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
];

const eventsConfig: AppletContainersConfig[] = [
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
];

const appletCreatorConfigWhole: AppletContainersConfig[] = [
    {
        id: "applet-purpose",
        label: "Applet Purpose",
        placeholder: "What is your app's primary purpose?",
        fields: [
            {
                brokerId: "0fc49b4c-fc8b-467e-9dda-f43dedf74a9d",
                label: "Primary Audience Type",
                type: "radio",
                placeholder: "Who is your ideal user?",
                customConfig: {
                    options: [
                        { id: "abc-123", value: "business", label: "Business" },
                        { id: "abc-124", value: "consumer", label: "Consumer" },
                        { id: "abc-125", value: "student", label: "Student" },
                        { id: "abc-126", value: "other", label: "Other" },
                    ],
                },
            },
            {
                brokerId: "0fc49b4c-fc8b-467e-9dda-f43dedf74a9d",
                label: "Target User",
                type: "input",
                placeholder: "Who is your ideal user?",
                customConfig: {},
            },
            {
                brokerId: "0fc49b4c-fc8b-467e-9dda-f43dedf74a9d",
                label: "Problem to Overcome",
                type: "textarea",
                placeholder: "Describe the problem your applet solves for users.",
                customConfig: {},
            },
        ],
    },
    {
        id: "applet-concept",
        label: "Applet Concept",
        placeholder: "What is the concept of your applet?",
        fields: [
            {
                brokerId: "0fc49b4c-fc8b-467e-9dda-f43dedf74a9d",
                label: "Core Concept",
                type: "textarea",
                placeholder: "Please provide a quick description of your applet's core concept.",
                customConfig: {
                    rows: 5,
                },
            },
        ],
    },
    {
        id: "applet-functionality",
        label: "Applet Functionality",
        placeholder: "What is the functionality of your applet?",
        fields: [
            {
                brokerId: "0fc49b4c-fc8b-467e-9dda-f43dedf74a9d",
                label: "Core Functionality",
                type: "checkbox",
                placeholder: "What core functionality does your app have to include?",
                customConfig: {
                    options: [
                        { id: "abc-123", value: "web-search", label: "Web Search" },
                        { id: "abc-124", value: "public-data", label: "Public Data" },
                        { id: "abc-125", value: "user-data", label: "User Data" },
                        { id: "abc-126", value: "specific-apis", label: "Specific APIs" },
                        { id: "abc-127", value: "internal-business-process", label: "Internal Business Process" },
                        { id: "abc-128", value: "internal-data", label: "Internal Data" },
                        { id: "abc-129", value: "industry-specific-knowledgebase", label: "Industry-Specific Knowledgebase" },
                        { id: "abc-130", value: "technical-knowledgebase", label: "Technical Knowledgebase" },
                        { id: "abc-131", value: "other", label: "Other" },
                    ],
                },
            },
        ],
    },
    {
        id: "ai-integration",
        label: "AI Integration",
        placeholder: "How will AI help your applet?",
        fields: [
            {
                brokerId: "0fc49b4c-fc8b-467e-9dda-f43dedf74a9d",
                label: "AI Capabilities",
                type: "checkbox",
                placeholder: "Select the AI capabilities your applet will leverage.",
                customConfig: {
                    options: [
                        { id: "ai-002", value: "decision-making", label: "Decision Making" },
                        { id: "ai-003", value: "data-synthesis", label: "Data Synthesis" },
                        { id: "ai-004", value: "personalization", label: "Personalization" },
                        { id: "ai-005", value: "content-generation", label: "Content Generation" },
                        { id: "ai-006", value: "translation", label: "Translation" },
                        { id: "ai-007", value: "predictive-analytics", label: "Predictive Analytics" },
                        { id: "ai-008", value: "workflow-automation", label: "Workflow Automation" },
                        { id: "ai-009", value: "knowledge-retrieval", label: "Knowledge Retrieval" },
                        { id: "ai-010", value: "code-generation", label: "Code Generation" },
                        { id: "ai-011", value: "data-organization", label: "Data Organization" },
                        { id: "ai-012", value: "consistent-formatting", label: "Consistent Formatting" },
                        { id: "ai-013", value: "error-detection", label: "Error Detection" },
                        { id: "ai-014", value: "task-prioritization", label: "Task Prioritization" },
                        { id: "ai-015", value: "other", label: "Other" },
                    ],
                },
            },
        ],
    },
];

const primaryAudienceTypeField: GroupFieldConfig = {
    brokerId: "0fc49b4c-fc8b-167e-9dda-f43dedf74a9d",
    label: "Primary Audience Type",
    type: "radio",
    placeholder: "Who is your ideal user?",
    customConfig: {
        options: [
            { id: "abc-123", value: "business", label: "Business" },
            { id: "abc-124", value: "consumer", label: "Consumer" },
            { id: "abc-125", value: "student", label: "Student" },
        ],
        includeOther: true,
    },
};

const targetUserField: GroupFieldConfig = {
    brokerId: "93c623ef-6025-4fb9-a362-e8cbb25bbaa0",
    label: "Target User",
    type: "input",
    placeholder: "Who is your ideal user?",
    customConfig: {},
};

const problemToOvercomeField: GroupFieldConfig = {
    brokerId: "0fc49b4c-fc8b-367e-9dda-f43dedf74a9d",
    label: "Problem to Overcome",
    type: "textarea",
    placeholder: "Describe the problem your applet solves for users.",
    customConfig: {},
};

const coreConceptField: GroupFieldConfig = {
    brokerId: "0fc49b4c-fc8b-567e-9dda-f43dedf74a9d",
    label: "Core Concept",
    type: "textarea",
    placeholder: "Please provide a quick description of your applet's core concept.",
    customConfig: {
        rows: 5,
    },
};

const coreFunctionalityField: GroupFieldConfig = {
    brokerId: "0fc49b4c-fc8b-667e-9dda-f43dedf74a9d",
    label: "Core Functionality",
    type: "checkbox",
    placeholder: "What core functionality does your app have to include?",
    customConfig: {
        options: [
            { id: "abc-123", value: "web-search", label: "Web Search" },
            { id: "abc-124", value: "public-data", label: "Public Data" },
            { id: "abc-125", value: "user-data", label: "User Data" },
            { id: "abc-126", value: "specific-apis", label: "Specific APIs" },
            { id: "abc-127", value: "internal-business-process", label: "Internal Business Process" },
            { id: "abc-128", value: "internal-data", label: "Internal Data" },
            { id: "abc-129", value: "industry-specific-knowledgebase", label: "Industry-Specific Knowledgebase" },
            { id: "abc-130", value: "technical-knowledgebase", label: "Technical Knowledgebase" },
            { id: "abc-131", value: "other", label: "Other" },
        ],
    },
};

const aiCapabilitiesField: GroupFieldConfig = {
    brokerId: "0fc49b4c-fc8b-767e-9dda-f43dedf74a9d",
    label: "AI Capabilities",
    type: "checkbox",
    placeholder: "Select the AI capabilities your applet will leverage.",
    customConfig: {
        options: [
            { id: "ai-002", value: "decision-making", label: "Decision Making" },
            { id: "ai-003", value: "data-synthesis", label: "Data Synthesis" },
            { id: "ai-004", value: "personalization", label: "Personalization" },
            { id: "ai-005", value: "content-generation", label: "Content Generation" },
            { id: "ai-006", value: "translation", label: "Translation" },
            { id: "ai-007", value: "predictive-analytics", label: "Predictive Analytics" },
            { id: "ai-008", value: "workflow-automation", label: "Workflow Automation" },
            { id: "ai-009", value: "knowledge-retrieval", label: "Knowledge Retrieval" },
            { id: "ai-010", value: "code-generation", label: "Code Generation" },
            { id: "ai-011", value: "data-organization", label: "Data Organization" },
            { id: "ai-012", value: "consistent-formatting", label: "Consistent Formatting" },
            { id: "ai-013", value: "error-detection", label: "Error Detection" },
            { id: "ai-014", value: "task-prioritization", label: "Task Prioritization" },
            { id: "ai-015", value: "other", label: "Other" },
        ],
    },
};

const appletPurposeContainer: AppletContainersConfig = {
    id: "applet-purpose",
    label: "Purpose",
    placeholder: "App primary purpose",
    fields: [primaryAudienceTypeField, targetUserField, problemToOvercomeField],
};

const appletConceptContainer: AppletContainersConfig = {
    id: "applet-concept",
    label: "Concept",
    placeholder: "Core concept",
    fields: [coreConceptField],
};

const appletFunctionalityContainer: AppletContainersConfig = {
    id: "applet-functionality",
    label: "Functionality",
    placeholder: "core functionality",
    fields: [coreFunctionalityField],
};

const aiIntegrationContainer: AppletContainersConfig = {
    id: "ai-integration",
    label: "AI Integration",
    placeholder: "AI capabilities",
    fields: [aiCapabilitiesField],
};

export const simpleAppCreatorDefinition: AppletContainersConfig[] = [
    appletPurposeContainer,
    appletConceptContainer,
    appletFunctionalityContainer,
    aiIntegrationContainer,
];


export const USER_INPUT_BROKER_IDS = [
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

export const SYSTEM_BROKER_IDS = [];
export const ORGANIZATION_BROKER_IDS = [];
export const PROJECT_BROKER_IDS = [];
export const CLIENT_BROKER_IDS = [];
export const ADDITIONAL_CONTEXT_BROKER_IDS = [];

export const ALL_BROKER_IDS = [
    ...USER_INPUT_BROKER_IDS,
    ...SYSTEM_BROKER_IDS,
    ...ORGANIZATION_BROKER_IDS,
    ...PROJECT_BROKER_IDS,
    ...CLIENT_BROKER_IDS,
    ...ADDITIONAL_CONTEXT_BROKER_IDS,
];

export const travelAgentListConfig: AppletListItemConfig[] = [
    { value: "simple-applet-creator", label: "Applet Creator" },
    { value: "stays", label: "Stays" },
    { value: "vegas-nightlife", label: "Vegas Nightlife" },
    { value: "restaurants", label: "Restaurants" },
    { value: "activities", label: "Activities" },
    { value: "shopping", label: "Shopping" },
    { value: "transportation", label: "Transportation" },
    { value: "events", label: "Events" },
    { value: "starter-app", label: "Starter App" },
];

export const extraButtonsConfig: CustomActionButton[] = [
    {
        label: "Travel Agent Chat",
        actionType: "button",
        knownMethod: "renderChat",
    },
];

export const everythingCombinedAppConfig: CustomAppConfig = {
    name: "Everything Combined",
    description: "Everything Combined",
    slug: "everything-combined",
    mainAppIcon: "TreePalm",
    mainAppSubmitIcon: "Search",
    creator: "Everything Combined",
    primaryColor: "gray",
    accentColor: "rose",
    appletList: travelAgentListConfig,
    extraButtons: extraButtonsConfig,
    layoutType: "twoColumn",
};

export const matrixAppCreatorAppConfig: CustomAppConfig = {
    name: "Matrix App Creator",
    description: "Matrix App Creator",
    slug: "matrix-app-creator",
    mainAppIcon: "SiCodemagic",
    mainAppSubmitIcon: "ArrowBigRightDash",
    creator: "Matrix App Creator",
    primaryColor: "gray",
    accentColor: "blue",
    appletList: [
        { value: "advanced-applet-creator", label: "Advanced Applet Creator" },
        { value: "simple-applet-creator", label: "Simple Applet Creator" },
    ],
    extraButtons: [
        {
            label: "See Sample Applet",
            actionType: "button",
            knownMethod: "renderSampleApplet",
        },
        {
            label: "Live Chat",
            actionType: "button",
            knownMethod: "renderChat",
        },
    ],
    layoutType: "twoColumn",
};

export const starterAppConfig: CustomAppConfig = {
    name: "Starter App",
    description: "Starter App",
    slug: "starter-app",
    mainAppIcon: "SiMagic",
    mainAppSubmitIcon: "FaPaperPlane",
    creator: "Starter App",
    primaryColor: "gray",
    accentColor: "blue",
    appletList: [{ value: "starter-applet", label: "Starter Applet" }],
    extraButtons: [
        {
            label: "Your Custom Link",
            actionType: "button",
            knownMethod: "renderSampleApplet",
        },
    ],
    layoutType: "open", // This needs to be editable, since it controls the field look and feel
};

export const minimalTravelAgentAppConfig: CustomAppConfig = {
    name: "Travel Agent",
    description: "Travel Agent",
    slug: "travel-agent",
    mainAppIcon: "TreePalm",
    mainAppSubmitIcon: "Search",
    creator: "Travel Agent",
    primaryColor: "gray",
    accentColor: "rose",
    appletList: [
        { value: "stays", label: "Stays" },
        { value: "vegas-nightlife", label: "Vegas Nightlife" },
        { value: "restaurants", label: "Restaurants" },
        { value: "activities", label: "Activities" },
        { value: "shopping", label: "Shopping" },
        { value: "transportation", label: "Transportation" },
        { value: "events", label: "Events" },
    ],
    extraButtons: [
        {
            label: "Travel Discounts",
            actionType: "button",
            knownMethod: "renderSampleApplet",
        },
    ],
    layoutType: "twoColumn",
};


export const availableApps: Record<string, CustomAppConfig> = {
    "starter-app": starterAppConfig,
    "travel-agent": minimalTravelAgentAppConfig,
    "everything-combined": everythingCombinedAppConfig,
    "matrix-app-creator": matrixAppCreatorAppConfig,
};

export function getSelectOptionsFromApps(apps: Record<string, CustomAppConfig>) {
    return Object.entries(apps).map(([slug, app]) => ({
      value: slug,
      label: app.name,
    }));
  }



  // This is a placeholder field for group checkboxes - we'll replace this dynamically
const placeholderCheckboxGroupField: GroupFieldConfig = {
    brokerId: "checkbox-group-placeholder-id",
    label: "Sample Checkbox Group",
    placeholder: "Select all that apply",
    type: "checkbox",
    customConfig: {
        options: [
            { id: "option-1", label: "Option 1", value: "option-1" },
            { id: "option-2", label: "Option 2", value: "option-2" },
            { id: "option-3", label: "Option 3", value: "option-3" }
        ],
        includeOther: true,
        direction: "vertical"
    }
};

// This is a placeholder field for single checkbox - we'll replace this dynamically
const placeholderSingleCheckboxField: GroupFieldConfig = {
    brokerId: "checkbox-single-placeholder-id",
    label: "Sample Checkbox",
    placeholder: "Sample checkbox placeholder",
    type: "checkbox",
    customConfig: {
        checkboxLabel: "Check me",
        required: false,
        defaultChecked: false,
        value: "true"
    }
};

// Default to checkbox group for initial display
let activeCheckboxField = placeholderCheckboxGroupField;

// Group container that will hold our checkbox field
const checkboxGroupContainer: AppletContainersConfig = {
    id: "sample-checkbox-group",
    label: "Sample Form Section",
    placeholder: "Sample form section with checkbox",
    description: "This section demonstrates a checkbox field",
    fields: [activeCheckboxField]
};

// The full applet configuration
export const starterAppletConfig: AppletContainersConfig[] = [
    checkboxGroupContainer
];

// Export the original fields for reference
export const originalCheckboxGroupField = { ...placeholderCheckboxGroupField };
export const originalSingleCheckboxField = { ...placeholderSingleCheckboxField };

// Helper function to update the field in place
export const updateCheckboxField = (newField: GroupFieldConfig) => {
    // Update the first field in the first container
    if (starterAppletConfig.length > 0 && starterAppletConfig[0].fields.length > 0) {
        starterAppletConfig[0].fields[0] = { ...newField };
        activeCheckboxField = newField;
    }
};

// Helper function to update the group container
export const updateCheckboxGroup = (groupLabel: string, groupPlaceholder: string, groupDescription?: string) => {
    if (starterAppletConfig.length > 0) {
        starterAppletConfig[0].label = groupLabel;
        starterAppletConfig[0].placeholder = groupPlaceholder;
        if (groupDescription) {
            starterAppletConfig[0].description = groupDescription;
        }
    }
}; 


const primaryAudienceTypeField2: GroupFieldConfig = {
    brokerId: "403ba44b-a5d1-4537-a6fe-1e214d23126b",
    label: "Primary Audience Type",
    type: "radio",
    placeholder: "Who will primarily use this applet?",
    customConfig: {
        options: [
            { id: "abc-123", value: "business", label: "Business Professionals" },
            { id: "abc-124", value: "consumer", label: "General Consumers" },
            { id: "abc-125", value: "student", label: "Students/Education" },
            { id: "abc-126", value: "internal", label: "Internal Team Members" },
            { id: "abc-127", value: "technical", label: "Technical Users" },
        ],
        includeOther: true,
    },
};

const targetUserField2: GroupFieldConfig = {
    brokerId: "93c623ef-6025-4fb9-a362-e8cbb25bbaa0",
    label: "Specific User Description",
    type: "textarea",
    placeholder: "Describe your ideal user in more detail (their role, needs, technical ability, etc.)",
    customConfig: {
        rows: 3,
    },
};

const userInteractionField: GroupFieldConfig = {
    brokerId: "1b2d9878-8c81-412f-974d-e103a3de2581",
    label: "User Interaction Style",
    type: "select",
    placeholder: "How will users primarily interact with your applet?",
    customConfig: {
        options: [
            { id: "int-001", value: "conversational", label: "Conversational (chat-like interface)" },
            { id: "int-002", value: "form-based", label: "Form-based (structured inputs)" },
            { id: "int-003", value: "document-upload", label: "Document Upload & Processing" },
            { id: "int-004", value: "dashboard", label: "Dashboard/Visualization Viewing" },
            { id: "int-005", value: "multi-step", label: "Multi-step Guided Process" },
        ],
        includeOther: true,
    },
};

// PROBLEM & PURPOSE SECTION
const problemToOvercomeField2: GroupFieldConfig = {
    brokerId: "8677b2e2-271a-4b7f-9be0-61ee4ab6966a",
    label: "Problem to Solve",
    type: "textarea",
    placeholder: "What specific problem or pain point does your applet address?",
    customConfig: {
        rows: 4,
    },
};

const appletPurposeField: GroupFieldConfig = {
    brokerId: "02f026c0-d7fd-4776-ab59-c56612594951",
    label: "Primary Purpose",
    type: "radio",
    placeholder: "What is the main purpose of your applet?",
    customConfig: {
        options: [
            { id: "pur-001", value: "automate-task", label: "Automate a Repetitive Task" },
            { id: "pur-002", value: "generate-content", label: "Generate or Transform Content" },
            { id: "pur-003", value: "analyze-data", label: "Analyze Data or Information" },
            { id: "pur-004", value: "decision-support", label: "Support Decision Making" },
            { id: "pur-005", value: "knowledge-access", label: "Access Specialized Knowledge" },
            { id: "pur-006", value: "process-documents", label: "Process or Extract from Documents" },
        ],
        includeOther: true,
    },
};

// CONCEPT & WORKFLOW SECTION
const coreConceptField2: GroupFieldConfig = {
    brokerId: "94fb6440-3d20-4910-a67d-5be774410e48",
    label: "Core Concept",
    type: "textarea",
    placeholder: "Describe your applet's core concept in a few sentences.",
    customConfig: {
        rows: 5,
    },
};

const workflowTypeField: GroupFieldConfig = {
    brokerId: "85435665-33e9-4fb0-a8d3-6eea5c98a218",
    label: "Workflow Structure",
    type: "radio",
    placeholder: "How would you describe the workflow of your applet?",
    customConfig: {
        options: [
            { id: "wf-001", value: "single-step", label: "Single-step", description: "(Input → Process → Output) A direct process that takes an input, processes it, and outputs a formatted result." },
            { id: "wf-002", value: "multi-step-linear", label: "Multi-step Linear", description: "(Sequential steps) A process that takes an input, processes it, and outputs a formatted result." },
            { id: "wf-003", value: "branching", label: "Branching", description: "(Different paths based on inputs/results) A process that takes an input, processes it, and outputs a formatted result." },
            { id: "wf-004", value: "iterative", label: "Iterative", description: "(Refining results through feedback) A process that takes an input, processes it, and outputs a formatted result." },
            { id: "wf-005", value: "hypermatrix", label: "Dynamic Hypermatrix", description: "(Anything goes!) A powerful process to auto-execute based on the availability of broker values!" },
        ],
        includeOther: true,
    },
};

const workflowDescriptionField: GroupFieldConfig = {
    brokerId: "4fa8ee46-d2d5-4258-bbe6-e85636a68140",
    label: "Workflow Description",
    type: "textarea",
    placeholder: "Briefly describe the steps from start to finish in your applet's workflow.",
    customConfig: {
        rows: 4,
    },
};

// INPUT & OUTPUT SECTION
const userInputTypesField: GroupFieldConfig = {
    brokerId: "fdf2d6bb-e514-4690-b384-7462514f39a8",
    label: "User Input Types",
    type: "checkbox",
    placeholder: "What types of inputs will users provide?",
    customConfig: {
        options: [
            { id: "in-001", value: "text-prompt", label: "Text Prompts/Questions" },
            { id: "in-002", value: "structured-form", label: "Structured Form Data" },
            { id: "in-003", value: "document-upload", label: "Document Uploads" },
            { id: "in-004", value: "selections", label: "Selections from Options" },
            { id: "in-005", value: "api-credentials", label: "API Credentials/Keys" },
            { id: "in-006", value: "data-source", label: "Data Source Connection" },
            { id: "in-007", value: "parameters", label: "Configuration Parameters" },
        ],
        includeOther: true,
    },
};

const outputTypesField: GroupFieldConfig = {
    brokerId: "9d122198-cab4-4d6c-aa67-4edbc8bb489d",
    label: "Expected Output Types",
    type: "checkbox",
    placeholder: "What types of outputs should your applet generate?",
    customConfig: {
        options: [
            { id: "out-001", value: "text-response", label: "Text Response/Answer" },
            { id: "out-002", value: "structured-report", label: "Structured Report" },
            { id: "out-003", value: "visualization", label: "Data Visualization/Chart" },
            { id: "out-004", value: "document", label: "Generated Document" },
            { id: "out-005", value: "action", label: "Action/Integration Trigger" },
            { id: "out-006", value: "recommendation", label: "Recommendation/Decision" },
            { id: "out-007", value: "data-extraction", label: "Extracted/Processed Data" },
        ],
        includeOther: true,
    },
};

// DATA & INTEGRATION SECTION
const dataSourcesField: GroupFieldConfig = {
    brokerId: "66be6b6c-30a8-4e0a-a7f7-005eba630b82",
    label: "Data Sources",
    type: "checkbox",
    placeholder: "What data sources will your applet need to access?",
    customConfig: {
        options: [
            { id: "data-001", value: "web-search", label: "Web Search" },
            { id: "data-002", value: "public-data", label: "Public Datasets" },
            { id: "data-003", value: "user-data", label: "User-provided Data" },
            { id: "data-004", value: "internal-data", label: "Internal Company Data" },
            { id: "data-005", value: "industry-knowledge", label: "Industry-Specific Knowledge" },
            { id: "data-006", value: "technical-knowledge", label: "Technical Knowledge" },
            { id: "data-007", value: "real-time-data", label: "Real-time Data Feeds" },
        ],
        includeOther: true,
    },
};

const integrationNeedsField: GroupFieldConfig = {
    brokerId: "7a293f2f-b912-4a5a-81b5-8e032fbcc8ef",
    label: "Integration Needs",
    type: "checkbox",
    placeholder: "Does your applet need to integrate with any external systems?",
    customConfig: {
        options: [
            { id: "int-001", value: "none", label: "None", description: "No external integrations needed" },
            { id: "int-002", value: "email", label: "Email", description: "Email systems" },
            { id: "int-003", value: "messaging", label: "Messaging", description: "Messaging platforms (Slack, Teams, etc.)" },
            { id: "int-004", value: "docs", label: "Documents", description: "Document systems (Google Docs, Office, etc.)" },
            { id: "int-005", value: "crm", label: "CRM", description: "CRM systems" },
            { id: "int-006", value: "project-mgmt", label: "Project Management", description: "Project management tools" },
            { id: "int-007", value: "database", label: "Databases", description: "Databases (SQL, NoSQL, etc.)" },
            { id: "int-008", value: "api", label: "External APIs", description: "Specific external APIs (e.g. Stripe, Twilio, etc.)" },
        ],
        includeOther: true,
    },
};

// AI CAPABILITIES SECTION
const aiCapabilitiesField2: GroupFieldConfig = {
    brokerId: "b2c7129c-9ad2-4cdb-922c-bb214aa42ba6",
    label: "AI Capabilities",
    type: "checkbox",
    placeholder: "Select the AI capabilities your applet will leverage.",
    customConfig: {
        options: [
            { id: "ai-001", value: "content-generation", label: "Content Generation" },
            { id: "ai-002", value: "data-analysis", label: "Data Analysis & Synthesis" },
            { id: "ai-003", value: "personalization", label: "Personalization" },
            { id: "ai-004", value: "decision-support", label: "Decision Support" },
            { id: "ai-005", value: "knowledge-retrieval", label: "Knowledge Retrieval" },
            { id: "ai-006", value: "document-processing", label: "Document Processing" },
            { id: "ai-007", value: "workflow-automation", label: "Workflow Automation" },
            { id: "ai-008", value: "language-translation", label: "Language Translation" },
            { id: "ai-009", value: "data-organization", label: "Data Organization & Structuring" },
            { id: "ai-010", value: "predictive-analytics", label: "Predictive Analytics" },
        ],
        includeOther: true,
    },
};

// AI MODEL PRIORITIES FIELD
const aiModelPrioritiesField: GroupFieldConfig = {
    brokerId: "1191073b-c7e6-4ac8-b702-44eda40cb295",
    label: "AI Model Priorities",
    type: "checkbox",
    placeholder: "What factors are most important for your AI model selection?",
    customConfig: {
        options: [
            { id: "pri-001", value: "low-cost", label: "Low Cost", description: "Budget-friendly operation." },
            { id: "pri-002", value: "high-speed", label: "High Speed", description: "Fast response times." },
            { id: "pri-003", value: "accuracy", label: "High Accuracy", description: "Precise, reliable outputs." },
            { id: "pri-004", value: "creativity", label: "Creativity", description: "Novel, diverse outputs." },
            { id: "pri-005", value: "reasoning", label: "Reasoning", description: "Strong reasoning, logical problem-solving." },
            { id: "pri-006", value: "coding", label: "Coding", description: "Code generation and analysis." },
            { id: "pri-007", value: "writing", label: "Content Writing", description: "High-quality writing." },
            { id: "pri-008", value: "long-context", label: "Long Context Window", description: "Handling large inputs." },
            { id: "pri-009", value: "fine-tuning", label: "Easy to Fine-tune", description: "Customizable." },
            { id: "pri-010", value: "multilingual", label: "Multilingual Capabilities", description: "Language support." },
            { id: "pri-011", value: "factual", label: "Factual Accuracy", description: "Minimal hallucinations." },
            { id: "pri-012", value: "math", label: "Mathematical Capabilities", description: "Mathematical capabilities." },
            { id: "pri-013", value: "structured-output", label: "Structured Output Generation", description: "Structured output generation." },
            { id: "pri-014", value: "less-restricted", label: "Less Restricted", description: "Fewer content limitations." },
            { id: "pri-015", value: "latest-knowledge", label: "Latest Knowledge Base", description: "Access to the latest knowledge base." },
            { id: "pri-016", value: "domain-specific", label: "Domain-Specific Expertise", description: "Domain-specific expertise." },
            { id: "pri-017", value: "consistency", label: "Output Consistency", description: "Consistent output." },
            { id: "pri-018", value: "instruction-following", label: "Precision", description: "Precise instruction following." },
            { id: "pri-019", value: "basic-tool-calling", label: "Basic Tool Calling", description: "Ability to use tools." },
            { id: "pri-020", value: "advanced-tool-calling", label: "Advanced Tool Calling", description: "Excels at using tools." },
            { id: "pri-021", value: "agentic", label: "Agentic", description: "Agentic capabilities." },
        ],
        includeOther: true,
    },
};

// INPUT TYPES FIELD
const inputTypesField: GroupFieldConfig = {
    brokerId: "640fb528-b405-40bc-a8a4-cc3b01e4a639",
    label: "Input Types",
    type: "checkbox",
    placeholder: "What types of inputs will your applet need to process?",
    customConfig: {
        options: [
            { id: "inp-001", value: "text", label: "Text", description: "Text prompts, instructions, content." },
            { id: "inp-002", value: "documents", label: "Documents", description: "PDF, Word, etc." },
            { id: "inp-003", value: "spreadsheets", label: "Spreadsheets", description: "Excel, CSV" },
            { id: "inp-004", value: "images", label: "Images", description: "Photos, diagrams, screenshots" },
            { id: "inp-005", value: "audio", label: "Audio Files", description: "Recordings, music" },
            { id: "inp-006", value: "video", label: "Video Files", description: "Video files" },
            { id: "inp-007", value: "online-video", label: "Online Video", description: "Youtube, Vimeo, etc." },
            { id: "inp-008", value: "real-time-speech", label: "Real-time Speech", description: "Voice input" },
            { id: "inp-009", value: "web-pages", label: "Web Pages", description: "URLs, HTML, scraping, etc." },
            { id: "inp-010", value: "code", label: "Code Files", description: "Various languages" },
            { id: "inp-011", value: "structured-data", label: "Structured Data", description: "JSON, XML" },  
            { id: "inp-012", value: "database", label: "Database Records", description: "Database records" },
            { id: "inp-013", value: "api-responses", label: "API Responses", description: "API responses" },
            { id: "inp-014", value: "forms", label: "Form Submissions", description: "Form submissions" },
            { id: "inp-015", value: "email", label: "Email Content", description: "Email content" },
            { id: "inp-016", value: "chat-history", label: "Chat/Conversation History", description: "Chat/conversation history" },
            { id: "inp-017", value: "presentations", label: "Presentations", description: "PowerPoint, Slides, etc." },
        ],
        includeOther: true,
    },
};


const mvpScopeField: GroupFieldConfig = {
    brokerId: "655904af-df03-40ad-9420-69ea62a46c36",
    label: "MVP Scope",
    type: "textarea",
    placeholder: "List your 'must-have' features.",
    helpText: "Describe your 'must-have' features for initial launch, followed by 'nice-to-have' features that could be added later. Be as specific as possible about what functionality is essential versus what could be developed in future iterations.",
    customConfig: {
        rows: 6,
        helpText: "Prioritizing features helps us focus development on what matters most. Consider what's absolutely necessary to solve your core problem versus what would enhance the experience but isn't critical for launch."
    },
};


// CONTAINER CONFIGURATIONS
const userInfoContainer: AppletContainersConfig = {
    id: "user-information",
    label: "User Information",
    placeholder: "Define your target users",
    fields: [
        primaryAudienceTypeField2,
        targetUserField2,
        userInteractionField,
    ],
};

const problemPurposeContainer: AppletContainersConfig = {
    id: "problem-purpose",
    label: "Problem & Purpose",
    placeholder: "Define the problem and purpose",
    fields: [
        problemToOvercomeField,
        appletPurposeField,
        mvpScopeField,
    ],
};

const conceptWorkflowContainer: AppletContainersConfig = {
    id: "concept-workflow",
    label: "Concept & Workflow",
    placeholder: "Define your concept and workflow",
    fields: [
        coreConceptField,
        workflowTypeField,
        workflowDescriptionField,
    ],
};

const inputOutputContainer: AppletContainersConfig = {
    id: "input-output",
    label: "Inputs & Outputs",
    placeholder: "Define inputs and outputs",
    fields: [
        inputTypesField,
        userInputTypesField,
        outputTypesField,
    ],
};

const aiCapabilitiesContainer: AppletContainersConfig = {
    id: "ai-capabilities",
    label: "AI Capabilities",
    placeholder: "Define AI capabilities",
    fields: [
        aiCapabilitiesField,
        aiModelPrioritiesField,
    ],
};

const dataIntegrationContainer: AppletContainersConfig = {
    id: "data-integration",
    label: "Data & Integrations",
    placeholder: "Define data sources and integrations",
    fields: [
        dataSourcesField,
        integrationNeedsField,
    ],
};


export const advancedAppletCreatorDefinition: AppletContainersConfig[] = [
    userInfoContainer,
    problemPurposeContainer,
    conceptWorkflowContainer,
    inputOutputContainer,
    dataIntegrationContainer,
    aiCapabilitiesContainer,
];







const aiModelPreferenceField: GroupFieldConfig = {
    brokerId: "0fc49b4c-fc8b-868e-9dda-f43dedf74a9d",
    label: "AI Model Preference",
    type: "radio",
    placeholder: "Do you have a preference for specific AI models?",
    customConfig: {
        options: [
            { id: "mod-001", value: "no-preference", label: "No preference (use system recommendation)" },
            { id: "mod-002", value: "openai", label: "OpenAI GPT Models (high capability, costs range significantly for different models)" },
            { id: "mod-003", value: "google", label: "Google AI Models (high capability, broad range of models, Some specialized models)" },
            { id: "mod-004", value: "anthropic", label: "Anthropic's Claude (Extremely capable, great for coding tasks)" },
            { id: "mod-005", value: "meta-llama", label: "Meta Llama (Great for basic tasks, extremely fast, low cost, easy to finetune)" },
            { id: "mod-006", value: "deepseek", label: "DeepSeek (Good for reasoning, low cost, good for finetuning)" },
            { id: "mod-007", value: "xai", label: "xAI Grok (high capability, great for reasoning, coding tasks, and less restricted/biased)" },
            { id: "mod-008", value: "requires-testing", label: "Requires testing (need to test the model to see if it's a good fit)" },
            { id: "mod-009", value: "specialized", label: "Specialized models (for specific tasks)" },
        ],
        includeOther: true,
    },
};


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


export const allSystemWideMockApplets: AvailableAppletConfigs = {
    "simple-applet-creator": simpleAppCreatorDefinition,
    "advanced-applet-creator": advancedAppletCreatorDefinition,
    "starter-applet": starterAppletConfig,
    stays: staysConfig,
    "vegas-nightlife": nightlifeConfig,
    restaurants: restaurantsConfig,
    activities: activitiesConfig,
    shopping: shoppingConfig,
    transportation: transportConfig,
    events: eventsConfig,
};



export { appTravelTwinConfig, appletBeachBloomConfig };

// Export individual field configurations to make them accessible
export {
    primaryAudienceTypeField,
    targetUserField,
    userInteractionField,
    problemToOvercomeField,
    appletPurposeField,
    coreConceptField,
    workflowTypeField,
    workflowDescriptionField,
    userInputTypesField,
    outputTypesField,
    dataSourcesField,
    integrationNeedsField,
    aiCapabilitiesField,
    aiModelPrioritiesField,
    inputTypesField,
    mvpScopeField,
    aiModelPreferenceField
};

