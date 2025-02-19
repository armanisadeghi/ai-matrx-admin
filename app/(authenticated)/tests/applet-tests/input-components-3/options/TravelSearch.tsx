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



// Data
const popularDestinations = [
  { name: 'New York', country: 'United States' },
  { name: 'Paris', country: 'France' },
  { name: 'London', country: 'United Kingdom' },
  { name: 'Tokyo', country: 'Japan' },
  { name: 'Rome', country: 'Italy' },
  { name: 'Barcelona', country: 'Spain' }
];



// Example 1: Travel Search (Stays & Experiences)
export const TravelSearchBar = () => {
  const [searchFocus, setSearchFocus] = useState(null);
  
  const staysContent = (
    <div className="flex w-full">
      <SearchField
        id="where-stays"
        label="Where"
        placeholder="Search destinations"
        isActive={searchFocus === 'where-stays'}
        onClick={setSearchFocus}
        onOpenChange={setSearchFocus}
      >
        <Command className="rounded-lg border-none">
          <CommandInput placeholder="Search destinations" className="text-gray-800 dark:text-gray-200" />
          <CommandList>
            <CommandEmpty>No destinations found.</CommandEmpty>
            <CommandGroup heading="Popular destinations">
              {popularDestinations.map((destination) => (
                <CommandItem key={destination.name} className="py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center">
                      <Map size={20} className="text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{destination.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{destination.country}</p>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </SearchField>

      <SearchField
        id="checkin"
        label="Check in"
        placeholder="Add dates"
        isActive={searchFocus === 'checkin'}
        onClick={setSearchFocus}
        onOpenChange={setSearchFocus}
      >
        <div className="p-3">
          <CalendarComponent mode="single" className="rounded-md" />
        </div>
      </SearchField>

      <SearchField
        id="checkout"
        label="Check out"
        placeholder="Add dates"
        isActive={searchFocus === 'checkout'}
        onClick={setSearchFocus}
        onOpenChange={setSearchFocus}
      >
        <div className="p-3">
          <CalendarComponent mode="single" className="rounded-md" />
        </div>
      </SearchField>

      <SearchField
        id="who"
        label="Who"
        placeholder="Add guests"
        isActive={searchFocus === 'who'}
        onClick={setSearchFocus}
        onOpenChange={setSearchFocus}
        isLast={true}
        actionButton={
          <div className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white rounded-full p-3 ml-2">
            <Search size={16} />
          </div>
        }
      >
        <div className="p-4 w-80">
          <div className="flex items-center justify-between py-4 border-b dark:border-gray-700">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">Adults</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ages 13 or above</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="w-8 h-8 rounded-full border dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">-</button>
              <span className="text-gray-800 dark:text-gray-200">0</span>
              <button className="w-8 h-8 rounded-full border dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">+</button>
            </div>
          </div>
          {/* More guest options... */}
        </div>
      </SearchField>
    </div>
  );

  const experiencesContent = (
    <div className="flex w-full">
      <SearchField
        id="where-exp"
        label="Where"
        placeholder="Search experiences"
        isActive={searchFocus === 'where-exp'}
        onClick={setSearchFocus}
        onOpenChange={setSearchFocus}
      >
        <Command className="rounded-lg border-none w-96">
          <CommandInput placeholder="Search experiences" />
          <CommandList>
            <CommandEmpty>No experiences found.</CommandEmpty>
            <CommandGroup heading="Popular experiences">
              {/* Experience items */}
            </CommandGroup>
          </CommandList>
        </Command>
      </SearchField>

      <SearchField
        id="date"
        label="Date"
        placeholder="Add when"
        isActive={searchFocus === 'date'}
        onClick={setSearchFocus}
        onOpenChange={setSearchFocus}
      >
        <div className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 mb-3">
              <button className="px-4 py-2 rounded-full border dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">Today</button>
              <button className="px-4 py-2 rounded-full border dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">Tomorrow</button>
              <button className="px-4 py-2 rounded-full border dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">This weekend</button>
            </div>
            <div>
              <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Choose date</h3>
              <CalendarComponent mode="single" className="rounded-md" />
            </div>
          </div>
        </div>
      </SearchField>

      <SearchField
        id="who-exp"
        label="Who"
        placeholder="Add guests"
        isActive={searchFocus === 'who-exp'}
        onClick={setSearchFocus}
        onOpenChange={setSearchFocus}
        isLast={true}
        actionButton={
          <div className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white rounded-full p-3 ml-2">
            <Search size={16} />
          </div>
        }
      >
        <div className="p-4 w-80">
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-1 text-gray-800 dark:text-gray-200">Choose group size</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Prices may vary per person</p>
          </div>
          {/* Guest count controls */}
        </div>
      </SearchField>
    </div>
  );

  const travelTabs = [
    {
      id: 'stays',
      label: 'Stays',
      content: staysContent
    },
    {
      id: 'experiences',
      label: 'Experiences',
      content: experiencesContent
    }
  ];

  return (
    <SearchBarContainer
      tabs={travelTabs}
      logo={<Home size={32} className="text-rose-500 dark:text-rose-400" />}
      defaultTab="stays"
      onTabChange={() => {}}
    />
  );
};
