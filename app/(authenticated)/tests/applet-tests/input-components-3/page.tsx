'use client';

import React, { useState } from 'react';
import { TravelSearchBar } from './options/TravelSearch';
import { TransportSearchBar } from './options/TransportSearch';
import { ShoppingSearchBar } from './options/CustomSearch';

// Usage
const App = () => {
  const [searchType, setSearchType] = useState('travel');
  
  return (
    <div className="p-4">
      <div className="mb-8 flex gap-4 justify-center">
        <button 
          onClick={() => setSearchType('travel')}
          className={`px-4 py-2 rounded-md ${searchType === 'travel' ? 'bg-rose-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
          Travel Search
        </button>
        <button 
          onClick={() => setSearchType('transport')}
          className={`px-4 py-2 rounded-md ${searchType === 'transport' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
          Transport Search
        </button>
        <button 
          onClick={() => setSearchType('custom')}
          className={`px-4 py-2 rounded-md ${searchType === 'custom' ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
          Shopping Search
        </button>
      </div>
      
      {searchType === 'travel' ? <TravelSearchBar /> : searchType === 'transport' ? <TransportSearchBar /> : <ShoppingSearchBar />}
    </div>
  );
};

export default App;