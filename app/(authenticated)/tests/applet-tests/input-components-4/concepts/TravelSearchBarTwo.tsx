// TravelSearchBar.tsx
import React, { useState } from 'react';
import { 
  Search, Plane, Bed, Car, MapPin, Calendar, Users, Building
} from 'lucide-react';
import SearchBarContainer, { SearchTab } from './search-bar/SearchBarContainer';
import { GroupFieldConfig } from './field-components/types';
import FieldGroupAdapter from './search-bar/FieldGroupAdapter';

// Configuration for different tab fields
const staysFieldsConfig: GroupFieldConfig[] = [
  {
    brokerId: "stay-location",
    label: "Where",
    placeholder: "Search destinations",
    type: "select",
    customConfig: {
      options: [
        { value: "newyork", label: "New York", group: "Popular" },
        { value: "losangeles", label: "Los Angeles", group: "Popular" },
        { value: "miami", label: "Miami", group: "Popular" },
        { value: "london", label: "London", group: "International" },
        { value: "paris", label: "Paris", group: "International" },
        { value: "tokyo", label: "Tokyo", group: "International" }
      ],
      inputPlaceholder: "Search for a city",
      width: "w-full"
    }
  },
  {
    brokerId: "stay-checkin",
    label: "Check-in",
    placeholder: "Add date",
    type: "date",
    customConfig: {
      width: "w-full"
    }
  },
  {
    brokerId: "stay-checkout",
    label: "Check-out",
    placeholder: "Add date",
    type: "date",
    customConfig: {
      width: "w-full"
    }
  },
  {
    brokerId: "stay-guests",
    label: "Guests",
    placeholder: "Add guests",
    type: "number",
    customConfig: {
      min: 1,
      max: 16,
      width: "w-full"
    }
  }
];

const flightsFieldsConfig: GroupFieldConfig[] = [
  {
    brokerId: "flight-from",
    label: "From",
    placeholder: "Departure airport",
    type: "select",
    customConfig: {
      options: [
        { value: "jfk", label: "New York (JFK)", group: "United States" },
        { value: "lax", label: "Los Angeles (LAX)", group: "United States" },
        { value: "ord", label: "Chicago (ORD)", group: "United States" },
        { value: "lhr", label: "London (LHR)", group: "International" },
        { value: "cdg", label: "Paris (CDG)", group: "International" }
      ],
      inputPlaceholder: "Search airports",
      width: "w-full"
    }
  },
  {
    brokerId: "flight-to",
    label: "To",
    placeholder: "Arrival airport",
    type: "select",
    customConfig: {
      options: [
        { value: "jfk", label: "New York (JFK)", group: "United States" },
        { value: "lax", label: "Los Angeles (LAX)", group: "United States" },
        { value: "ord", label: "Chicago (ORD)", group: "United States" },
        { value: "lhr", label: "London (LHR)", group: "International" },
        { value: "cdg", label: "Paris (CDG)", group: "International" }
      ],
      inputPlaceholder: "Search airports",
      width: "w-full"
    }
  },
  {
    brokerId: "flight-depart",
    label: "Depart",
    placeholder: "Add date",
    type: "date",
    customConfig: {
      width: "w-full"
    }
  },
  {
    brokerId: "flight-return",
    label: "Return",
    placeholder: "Add date",
    type: "date",
    customConfig: {
      width: "w-full"
    }
  },
  {
    brokerId: "flight-passengers",
    label: "Travelers",
    placeholder: "Add travelers",
    type: "number",
    customConfig: {
      min: 1,
      max: 9,
      width: "w-full"
    }
  }
];

const carsFieldsConfig: GroupFieldConfig[] = [
  {
    brokerId: "car-pickup",
    label: "Pick-up location",
    placeholder: "Enter location",
    type: "select",
    customConfig: {
      options: [
        { value: "airport", label: "Airport", group: "Location Type" },
        { value: "hotel", label: "Hotel", group: "Location Type" },
        { value: "address", label: "Specific Address", group: "Location Type" },
        { value: "newyork", label: "New York", group: "Popular Cities" },
        { value: "losangeles", label: "Los Angeles", group: "Popular Cities" }
      ],
      inputPlaceholder: "Search locations",
      width: "w-full"
    }
  },
  {
    brokerId: "car-pickup-date",
    label: "Pick-up date",
    placeholder: "Add date",
    type: "date",
    customConfig: {
      width: "w-full"
    }
  },
  {
    brokerId: "car-dropoff-date",
    label: "Drop-off date",
    placeholder: "Add date",
    type: "date",
    customConfig: {
      width: "w-full"
    }
  }
];

const experiencesFieldsConfig: GroupFieldConfig[] = [
  {
    brokerId: "experience-location",
    label: "Location",
    placeholder: "Where are you going?",
    type: "select",
    customConfig: {
      options: [
        { value: "newyork", label: "New York", group: "Popular" },
        { value: "losangeles", label: "Los Angeles", group: "Popular" },
        { value: "lasvegas", label: "Las Vegas", group: "Popular" },
        { value: "orlando", label: "Orlando", group: "Popular" },
        { value: "london", label: "London", group: "International" },
        { value: "paris", label: "Paris", group: "International" }
      ],
      inputPlaceholder: "Search destinations",
      width: "w-full"
    }
  },
  {
    brokerId: "experience-date",
    label: "Date",
    placeholder: "Add date",
    type: "date",
    customConfig: {
      width: "w-full"
    }
  },
  {
    brokerId: "experience-people",
    label: "Number of people",
    placeholder: "Add guests",
    type: "number",
    customConfig: {
      min: 1,
      max: 20,
      width: "w-full"
    }
  }
];

const TravelSearchBar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("stays");

  // Search button for all tabs
  const searchButton = (
    <div className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-full p-3">
      <Search size={18} />
    </div>
  );

  // Define tabs with their content
  const travelTabs: SearchTab[] = [
    {
      id: "stays",
      label: "Stays",
      icon: <Bed size={18} className="mr-1" />,
      content: (
        <FieldGroupAdapter 
          fields={staysFieldsConfig}
          actionButton={searchButton}
          className="mx-4 my-2"
        />
      )
    },
    {
      id: "flights",
      label: "Flights",
      icon: <Plane size={18} className="mr-1" />,
      content: (
        <FieldGroupAdapter 
          fields={flightsFieldsConfig}
          actionButton={searchButton}
          className="mx-4 my-2"
        />
      )
    },
    {
      id: "cars",
      label: "Cars",
      icon: <Car size={18} className="mr-1" />,
      content: (
        <FieldGroupAdapter 
          fields={carsFieldsConfig}
          actionButton={searchButton}
          className="mx-4 my-2"
        />
      )
    },
    {
      id: "experiences",
      label: "Experiences",
      icon: <Building size={18} className="mr-1" />,
      content: (
        <FieldGroupAdapter 
          fields={experiencesFieldsConfig}
          actionButton={searchButton}
          className="mx-4 my-2"
        />
      )
    }
  ];

  // Right navigation items
  const rightNav = (
    <div className="flex items-center gap-3">
      <button className="text-sm text-gray-600 dark:text-gray-300 font-medium hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2">
        Sign In
      </button>
      <button className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium">
        Register
      </button>
    </div>
  );

  return (
    <SearchBarContainer
      tabs={travelTabs}
      logo={<Plane size={28} className="text-blue-600" />}
      defaultTab="stays"
      rightNav={rightNav}
      onTabChange={setActiveTab}
      className="max-w-6xl mx-auto"
    />
  );
};

export default TravelSearchBar;