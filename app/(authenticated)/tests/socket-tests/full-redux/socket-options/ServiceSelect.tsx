'use client'
import React, { useState, useEffect } from 'react';
import { getAvailableServices } from '@/constants/socket-schema';

interface ServiceSelectProps {
  onServiceChange?: (service: string) => void;
  value?: string;
}

const ServiceSelect: React.FC<ServiceSelectProps> = ({ onServiceChange, value }) => {
  const [service, setService] = useState<string>(value || '');
  const services = getAvailableServices();
  
  // Update internal state when parent prop changes
  useEffect(() => {
    if (value !== undefined && value !== service) {
      setService(value);
    }
  }, [value, service]);
  
  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newService = e.target.value;
    setService(newService);
    if (onServiceChange) {
      onServiceChange(newService);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Service:
        </label>
        <select
          value={service}
          onChange={handleServiceChange}
          className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none"
        >
          <option value="">Select Service</option>
          {services.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
};

export default ServiceSelect; 