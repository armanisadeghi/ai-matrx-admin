import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Clock, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SmartFKReference = ({ 
  value,                    // Current FK value
  displayValue,             // Initial display value (can be null)
  onSelect,                 // Callback when a new value is selected
  fetchOptions,            // Async function to fetch reference options
  fetchDetails,            // Async function to fetch full details of a single value
  searchFields = ['name'],  // Fields to search in the reference data
  relationshipType = 'one-to-one', // or 'one-to-many'
  recentLimit = 5,         // Number of recent selections to remember
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState([]);
  const [details, setDetails] = useState(null);
  const [recentSelections, setRecentSelections] = useState([]);
  const [error, setError] = useState(null);
  const searchDebounceRef = useRef(null);
  
  // Load and manage recent selections from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('fk-recent-selections');
    if (stored) {
      try {
        setRecentSelections(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent selections:', e);
      }
    }
  }, []);

  // Smart search with debouncing
  const handleSearch = useCallback(async (term) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const results = await fetchOptions(term);
        setOptions(results);
      } catch (e) {
        setError('Failed to fetch options. Please try again.');
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, [fetchOptions]);

  // Load details when value changes
  useEffect(() => {
    if (value && fetchDetails) {
      const loadDetails = async () => {
        setIsLoading(true);
        try {
          const detailData = await fetchDetails(value);
          setDetails(detailData);
        } catch (e) {
          setError('Failed to load reference details');
        } finally {
          setIsLoading(false);
        }
      };
      loadDetails();
    }
  }, [value, fetchDetails]);

  // Handle selection
  const handleSelect = useCallback((selected) => {
    onSelect(selected);
    
    // Update recent selections
    setRecentSelections(prev => {
      const updated = [selected, ...prev.filter(item => item.id !== selected.id)]
        .slice(0, recentLimit);
      localStorage.setItem('fk-recent-selections', JSON.stringify(updated));
      return updated;
    });
  }, [onSelect, recentLimit]);

  return (
    <div className="w-full max-w-md">
      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="text"
          className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            handleSearch(e.target.value);
          }}
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results List */}
      <div className="space-y-2">
        {options.map(option => (
          <Card
            key={option.id}
            className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => handleSelect(option)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{option.name}</div>
                {option.description && (
                  <div className="text-sm text-gray-500">{option.description}</div>
                )}
              </div>
              {value === option.id && <Check className="h-4 w-4 text-green-500" />}
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Selections */}
      {recentSelections.length > 0 && searchTerm.length === 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Recent Selections</h3>
          <div className="space-y-2">
            {recentSelections.map(recent => (
              <div
                key={recent.id}
                className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900"
                onClick={() => handleSelect(recent)}
              >
                <Clock className="h-4 w-4" />
                <span>{recent.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Value Details */}
      {details && (
        <Card className="mt-4 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium">{details.name}</h3>
              <div className="mt-1 text-sm text-gray-500">
                {Object.entries(details)
                  .filter(([key]) => !['id', 'name'].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <span className="font-medium">{key}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
              </div>
            </div>
            {details.url && (
              <a
                href={details.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default SmartFKReference;