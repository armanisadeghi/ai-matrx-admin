import {FlexFormField} from "@/components/matrx/AnimatedForm/FlexAnimatedForm";

export const formFields: FlexFormField[] = [
    // Text Fields
    { name: 'firstName', label: 'First Name', type: 'text', required: true },
    { name: 'lastName', label: 'Last Name', type: 'text', required: true },

    // Email Fields
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'alternateEmail', label: 'Alternate Email', type: 'email' },

    // Password Fields
    { name: 'password', label: 'Password', type: 'password', required: true },
    { name: 'confirmPassword', label: 'Confirm Password', type: 'password', required: true },

    // Number Fields
    { name: 'age', label: 'Age', type: 'number', required: true },
    { name: 'numberOfGuests', label: 'Number of Guests', type: 'number' },

    // Date, Time, and Datetime-Local Fields
    { name: 'birthdate', label: 'Birthdate', type: 'date', required: true },
    { name: 'appointment_time', label: 'Appointment Time', type: 'time' },
    { name: 'event_datetime', label: 'Event Date and Time', type: 'datetime-local' },

    // Month, Week Fields
    { name: 'preferred_month', label: 'Preferred Month', type: 'month' },
    { name: 'week_number', label: 'Week Number', type: 'week' },

    // Telephone and URL Fields
    { name: 'phone', label: 'Phone Number', type: 'tel' },
    { name: 'alternatePhone', label: 'Alternate Phone Number', type: 'tel' },
    { name: 'website', label: 'Website', type: 'url' },
    { name: 'portfolio', label: 'Portfolio Website', type: 'url' },

    // Color Fields
    { name: 'favorite_color', label: 'Favorite Color', type: 'color' },
    { name: 'secondary_color', label: 'Secondary Favorite Color', type: 'color' },

    // Textareas
    { name: 'bio', label: 'Bio', type: 'textarea' },
    { name: 'additionalInfo', label: 'Additional Information', type: 'textarea' },

    // Select Fields (Few options)
    {
        name: 'country',
        label: 'Country',
        type: 'select',
        options: ['USA', 'Canada'],
        required: true
    },
    {
        name: 'state',
        label: 'State/Province',
        type: 'select',
        options: ['California', 'New York'],
        required: true
    },

    // Select Fields (Many options)
    {
        name: 'language',
        label: 'Preferred Language',
        type: 'select',
        options: ['English', 'Spanish', 'French', 'German', 'Mandarin', 'Japanese', 'Korean', 'Arabic'],
        required: true
    },
    {
        name: 'timezone',
        label: 'Preferred Timezone',
        type: 'select',
        options: ['PST', 'EST', 'CST', 'GMT', 'CET', 'IST', 'JST'],
        required: true
    },

    // Checkbox Fields
    { name: 'newsletter', label: 'Subscribe to Newsletter', type: 'checkbox' },
    { name: 'terms', label: 'Agree to Terms', type: 'checkbox', required: true },

    // Radio Fields (Few options)
    {
        name: 'gender',
        label: 'Gender',
        type: 'radio',
        options: ['Male', 'Female', 'Other'],
        required: true
    },
    {
        name: 'maritalStatus',
        label: 'Marital Status',
        type: 'radio',
        options: ['Single', 'Married', 'Divorced'],
        required: true
    },

    // Radio Fields (Many options)
    {
        name: 'hobbies',
        label: 'Hobbies',
        type: 'radio',
        options: ['Reading', 'Traveling', 'Cooking', 'Sports', 'Music', 'Art', 'Photography', 'Gaming'],
        required: true
    },
    {
        name: 'preferredContact',
        label: 'Preferred Contact Method',
        type: 'radio',
        options: ['Email', 'Phone', 'Text Message', 'In Person', 'Video Call'],
        required: true
    },

    // New Component - JSON Editor
    {
        name: 'jsonConfig',
        label: 'Configuration Settings',
        type: 'json',
        required: true
    },
    {
        name: 'advancedSettings',
        label: 'Advanced JSON Settings',
        type: 'json'
    },

    // New Component - File Upload
    {
        name: 'resume',
        label: 'Upload Resume',
        type: 'file',
        required: true
    },
    {
        name: 'profilePicture',
        label: 'Upload Profile Picture',
        type: 'file'
    },

    // New Component - Slider
    {
        name: 'satisfactionLevel',
        label: 'Satisfaction Level',
        type: 'slider',
        min: 0,
        max: 10
    },
    {
        name: 'experienceLevel',
        label: 'Experience Level',
        type: 'slider',
        min: 1,
        max: 5
    },

    // New Component - Image Display
    {
        name: 'profileImage',
        label: 'Profile Image',
        type: 'image',
        src: 'https://images.unsplash.com/photo-1519759605127-1fc04211f956'
    },
    {
        name: 'bannerImage',
        label: 'Banner Image',
        type: 'image',
        src: 'https://images.unsplash.com/photo-1713472728570-5a6ef3947de1'
    }
];
