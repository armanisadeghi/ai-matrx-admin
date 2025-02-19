'use client';

import React, { useState } from 'react';
import { Home, Search, Calendar, Map, Car, Bike, Train, Plane } from 'lucide-react';
import SearchBarContainer from '../SearchBarContainer';
import SearchField from '../SearchField';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Calendar as CalendarComponent
} from '@/components/ui/calendar';
import { TabsList, TabsTrigger } from '@/components/ui';

// Example 2: Transport Search with 4 options
export const TransportSearchBar = () => {
  const [searchFocus, setSearchFocus] = useState(null);
  
  // Common search field for all transport types
  const renderTransportFields = (prefix) => (
    <div className="flex w-full">
      <SearchField
        id={`from-${prefix}`}
        label="From"
        placeholder="Enter departure"
        isActive={searchFocus === `from-${prefix}`}
        onClick={setSearchFocus}
        onOpenChange={setSearchFocus}
      >
        <div className="w-96 p-4">
          <h3 className="font-medium mb-3 text-gray-800 dark:text-gray-200">Select departure location</h3>
          <Command>
            <CommandInput placeholder="Search locations" />
            <CommandList>
              <CommandEmpty>No locations found.</CommandEmpty>
              <CommandGroup heading="Recent searches">
                {/* Location items */}
              </CommandGroup>
              <CommandGroup heading="Popular destinations">
                {/* Location items */}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </SearchField>

      <SearchField
        id={`to-${prefix}`}
        label="To"
        placeholder="Enter destination"
        isActive={searchFocus === `to-${prefix}`}
        onClick={setSearchFocus}
        onOpenChange={setSearchFocus}
      >
        <div className="w-96 p-4">
          <h3 className="font-medium mb-3 text-gray-800 dark:text-gray-200">Select destination</h3>
          <Command>
            <CommandInput placeholder="Search destinations" />
            <CommandList>
              <CommandEmpty>No destinations found.</CommandEmpty>
              <CommandGroup heading="Popular destinations">
                {/* Destination items */}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </SearchField>

      <SearchField
        id={`date-${prefix}`}
        label="When"
        placeholder="Choose date"
        isActive={searchFocus === `date-${prefix}`}
        onClick={setSearchFocus}
        onOpenChange={setSearchFocus}
        isLast={true}
        actionButton={
          <div className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-full p-3 ml-2">
            <Search size={16} />
          </div>
        }
      >
        <div className="p-4">
          <CalendarComponent mode="single" className="rounded-md" />
        </div>
      </SearchField>
    </div>
  );

  const transportTabs = [
    {
      id: 'car',
      label: 'Car',
      content: renderTransportFields('car'),
      icon: <Car size={18} className="mr-2" />
    },
    {
      id: 'train',
      label: 'Train',
      content: renderTransportFields('train'),
      icon: <Train size={18} className="mr-2" />
    },
    {
      id: 'flight',
      label: 'Flight',
      content: renderTransportFields('flight'),
      icon: <Plane size={18} className="mr-2" />
    },
    {
      id: 'bike',
      label: 'Bike',
      content: renderTransportFields('bike'),
      icon: <Bike size={18} className="mr-2" />
    }
  ];

  // Custom tabs with icons
  const CustomTabsList = () => (
    <TabsList className="bg-transparent border-b border-gray-200 dark:border-gray-700 w-full justify-start gap-6">
      {transportTabs.map((tab) => (
        <TabsTrigger 
          key={tab.id}
          value={tab.id} 
          className="pb-2 px-0 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none flex items-center"
        >
          {tab.icon}
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );

  return (
    <SearchBarContainer
      tabs={transportTabs}
      logo={<Car size={32} className="text-blue-500 dark:text-blue-400" />}
      defaultTab="car"
      customTabsList={<CustomTabsList />}
      onTabChange={() => {}}
      rightNav={
        <div className="flex items-center gap-3">
          <button className="bg-transparent border border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2 rounded-full text-sm font-medium">
            Sign In
          </button>
          <button className="bg-blue-500 text-white hover:bg-blue-600 px-4 py-2 rounded-full text-sm font-medium">
            Create Account
          </button>
        </div>
      }
    />
  );
};

