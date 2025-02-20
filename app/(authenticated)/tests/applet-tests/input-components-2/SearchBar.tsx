'use client';

import React, { useState } from 'react';
import { Search, Users, Calendar, Globe, Menu, Home, Map, LandPlot, LayoutPanelLeft } from 'lucide-react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
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

export const SearchBar = () => {
  const [activeTab, setActiveTab] = useState('stays');
  const [searchFocus, setSearchFocus] = useState(null);
  
  // Popular destinations for the "Where" dropdown
  const popularDestinations = [
    { name: 'New York', country: 'United States' },
    { name: 'Paris', country: 'France' },
    { name: 'London', country: 'United Kingdom' },
    { name: 'Tokyo', country: 'Japan' },
    { name: 'Rome', country: 'Italy' },
    { name: 'Barcelona', country: 'Spain' }
  ];

  // Popular experiences for the experiences tab
  const popularExperiences = [
    { name: 'Cooking Class', category: 'Food & Drink' },
    { name: 'City Walking Tour', category: 'Sightseeing' },
    { name: 'Sunset Cruise', category: 'Outdoor' },
    { name: 'Wine Tasting', category: 'Food & Drink' },
    { name: 'Art Workshop', category: 'Creative' }
  ];

  const handleTabChange = (value) => {
    setActiveTab(value);
    setSearchFocus(null);
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 transition-colors">

      {/* Top Navigation */}
      <div className="flex items-center justify-between pt-2 pb-2 px-6">
        <div className="flex items-center">
          <div className="text-rose-500 dark:text-rose-400 mr-12">
            <LayoutPanelLeft size={32} className="text-rose-500 dark:text-rose-400" />
          </div>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-64">
            <TabsList className="bg-transparent border-b border-gray-200 dark:border-gray-700 w-full justify-start gap-8">
              <TabsTrigger 
                value="stays" 
                className="pb-2 px-0 data-[state=active]:border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-white rounded-none text-gray-800 dark:text-gray-200"
              >
                Stays
              </TabsTrigger>
              <TabsTrigger 
                value="experiences" 
                className="pb-2 px-0 data-[state=active]:border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-white rounded-none text-gray-800 dark:text-gray-200"
              >
                Experiences
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full px-4 py-2 text-gray-800 dark:text-gray-200">
            List your place
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
            <Globe size={20} />
          </button>
          <div className="flex items-center border rounded-full p-1 shadow-sm hover:shadow-md transition dark:border-gray-700 bg-white dark:bg-gray-800">
            <Menu size={18} className="ml-2 text-gray-600 dark:text-gray-400" />
            <div className="w-8 h-8 bg-gray-500 dark:bg-gray-600 rounded-full ml-3"></div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-4xl mx-auto mt-2 mb-6 relative ">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="flex rounded-full border shadow-sm overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700">
            <TabsContent value="stays" className="w-full m-0 p-0">
              <div className="flex w-full">
                {/* Where - Stays */}
                <Popover open={searchFocus === 'where-stays'} onOpenChange={(open) => setSearchFocus(open ? 'where-stays' : null)}>
                  <PopoverTrigger asChild>
                    <button 
                      className="flex-1 text-left py-3 px-6 focus:outline-none hover:bg-gray-50 dark:hover:bg-gray-700 border-r dark:border-gray-700"
                      onClick={() => setSearchFocus('where-stays')}
                    >
                      <div className="font-semibold text-xs text-gray-800 dark:text-gray-200">Where</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Search destinations</div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 p-0 bg-white dark:bg-gray-800 border dark:border-gray-700" align="start">
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
                  </PopoverContent>
                </Popover>

                {/* Check in */}
                <Popover open={searchFocus === 'checkin'} onOpenChange={(open) => setSearchFocus(open ? 'checkin' : null)}>
                  <PopoverTrigger asChild>
                    <button 
                      className="flex-1 text-left py-3 px-6 focus:outline-none hover:bg-gray-50 dark:hover:bg-gray-700 border-r dark:border-gray-700"
                      onClick={() => setSearchFocus('checkin')}
                    >
                      <div className="font-semibold text-xs text-gray-800 dark:text-gray-200">Check in</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Add dates</div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-800 border dark:border-gray-700" align="start">
                    <div className="p-3">
                      <CalendarComponent 
                        mode="single"
                        className="rounded-md"
                      />
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Check out */}
                <Popover open={searchFocus === 'checkout'} onOpenChange={(open) => setSearchFocus(open ? 'checkout' : null)}>
                  <PopoverTrigger asChild>
                    <button 
                      className="flex-1 text-left py-3 px-6 focus:outline-none hover:bg-gray-50 dark:hover:bg-gray-700 border-r dark:border-gray-700"
                      onClick={() => setSearchFocus('checkout')}
                    >
                      <div className="font-semibold text-xs text-gray-800 dark:text-gray-200">Check out</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Add dates</div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-800 border dark:border-gray-700" align="start">
                    <div className="p-3">
                      <CalendarComponent 
                        mode="single"
                        className="rounded-md"
                      />
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Who */}
                <Popover open={searchFocus === 'who'} onOpenChange={(open) => setSearchFocus(open ? 'who' : null)}>
                  <PopoverTrigger asChild>
                    <button 
                      className="flex-grow text-left py-3 px-6 focus:outline-none hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
                      onClick={() => setSearchFocus('who')}
                    >
                      <div className="flex-grow">
                        <div className="font-semibold text-xs text-gray-800 dark:text-gray-200">Who</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Add guests</div>
                      </div>
                      <div className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white rounded-full p-3 ml-2">
                        <Search size={16} />
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 bg-white dark:bg-gray-800 border dark:border-gray-700" align="end">
                    <div className="p-4">
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
                      <div className="flex items-center justify-between py-4 border-b dark:border-gray-700">
                        <div>
                          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Children</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Ages 2-12</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button className="w-8 h-8 rounded-full border dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">-</button>
                          <span className="text-gray-800 dark:text-gray-200">0</span>
                          <button className="w-8 h-8 rounded-full border dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">+</button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-4">
                        <div>
                          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Infants</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Under 2</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button className="w-8 h-8 rounded-full border dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">-</button>
                          <span className="text-gray-800 dark:text-gray-200">0</span>
                          <button className="w-8 h-8 rounded-full border dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">+</button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </TabsContent>

            <TabsContent value="experiences" className="w-full m-0 p-0">
              <div className="flex w-full">
                {/* Where - Experiences */}
                <Popover open={searchFocus === 'where-exp'} onOpenChange={(open) => setSearchFocus(open ? 'where-exp' : null)}>
                  <PopoverTrigger asChild>
                    <button 
                      className="flex-1 text-left py-3 px-6 focus:outline-none hover:bg-gray-50 dark:hover:bg-gray-700 border-r dark:border-gray-700"
                      onClick={() => setSearchFocus('where-exp')}
                    >
                      <div className="font-semibold text-xs text-gray-800 dark:text-gray-200">Where</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Search experiences</div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 p-0 bg-white dark:bg-gray-800 border dark:border-gray-700" align="start">
                    <Command className="rounded-lg border-none">
                      <CommandInput placeholder="Search experiences" className="text-gray-800 dark:text-gray-200" />
                      <CommandList>
                        <CommandEmpty>No experiences found.</CommandEmpty>
                        <CommandGroup heading="Popular experiences">
                          {popularExperiences.map((experience) => (
                            <CommandItem key={experience.name} className="py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center">
                                  <Calendar size={20} className="text-gray-500 dark:text-gray-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800 dark:text-gray-200">{experience.name}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">{experience.category}</p>
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Date */}
                <Popover open={searchFocus === 'date'} onOpenChange={(open) => setSearchFocus(open ? 'date' : null)}>
                  <PopoverTrigger asChild>
                    <button 
                      className="flex-1 text-left py-3 px-6 focus:outline-none hover:bg-gray-50 dark:hover:bg-gray-700 border-r dark:border-gray-700"
                      onClick={() => setSearchFocus('date')}
                    >
                      <div className="font-semibold text-xs text-gray-800 dark:text-gray-200">Date</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Add when</div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-800 border dark:border-gray-700" align="start">
                    <div className="p-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex gap-4 mb-3">
                          <button className="px-4 py-2 rounded-full border dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">Today</button>
                          <button className="px-4 py-2 rounded-full border dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">Tomorrow</button>
                          <button className="px-4 py-2 rounded-full border dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">This weekend</button>
                        </div>
                        <div>
                          <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">Choose date</h3>
                          <CalendarComponent 
                            mode="single"
                            className="rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Who */}
                <Popover open={searchFocus === 'who-exp'} onOpenChange={(open) => setSearchFocus(open ? 'who-exp' : null)}>
                  <PopoverTrigger asChild>
                    <button 
                      className="flex-grow text-left py-3 px-6 focus:outline-none hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
                      onClick={() => setSearchFocus('who-exp')}
                    >
                      <div className="flex-grow">
                        <div className="font-semibold text-xs text-gray-800 dark:text-gray-200">Who</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Add guests</div>
                      </div>
                      <div className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white rounded-full p-3 ml-2">
                        <Search size={16} />
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 bg-white dark:bg-gray-800 border dark:border-gray-700" align="end">
                    <div className="p-4">
                      <div className="mb-4">
                        <h3 className="font-semibold text-lg mb-1 text-gray-800 dark:text-gray-200">Choose group size</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Prices may vary per person</p>
                      </div>
                      <div className="flex items-center justify-between py-4">
                        <div>
                          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Guests</h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <button className="w-8 h-8 rounded-full border dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">-</button>
                          <span className="text-gray-800 dark:text-gray-200">0</span>
                          <button className="w-8 h-8 rounded-full border dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">+</button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default SearchBar;