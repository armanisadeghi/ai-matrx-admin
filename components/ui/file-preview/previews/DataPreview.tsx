// previews/DataPreview.tsx
import React, { useEffect, useState } from 'react';

interface DataPreviewProps {
  file: {
    url: string;
    blob?: Blob | null;
    type: string;
    details?: any;
  };
  isLoading: boolean;
}

const DataPreview: React.FC<DataPreviewProps> = ({ file, isLoading }) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const loadData = async () => {
      if (!file.url || isLoading) return;
      
      setDataLoading(true);
      setError(null);
      
      try {
        const extension = file.details?.extension?.toLowerCase();
        
        if (extension === 'json') {
          const response = await fetch(file.url);
          const jsonData = await response.json();
          setData(jsonData);
        } 
        else if (extension === 'csv') {
          const response = await fetch(file.url);
          const text = await response.text();
          
          // Simple CSV parsing - in a real app, use a library like Papa Parse
          const rows = text.split('\n').map(row => row.split(','));
          setData({
            headers: rows[0],
            rows: rows.slice(1).filter(row => row.length > 1)
          });
        }
        else {
          setError(`Preview for ${extension} files is not fully implemented yet.`);
        }
      } catch (err) {
        console.error('Error loading data file:', err);
        setError(`Failed to load data: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setDataLoading(false);
      }
    };
    
    loadData();
  }, [file.url, isLoading, file.details?.extension]);
  
  if (isLoading || dataLoading) {
    return <div className="flex items-center justify-center h-full">Loading data...</div>;
  }
  
  if (error) {
    return <div className="flex items-center justify-center h-full text-red-500">{error}</div>;
  }
  
  const renderJsonData = () => {
    return (
      <div className="overflow-auto p-4 h-full w-full">
        <pre className="text-sm">{JSON.stringify(data, null, 2)}</pre>
      </div>
    );
  };
  
  const renderCsvData = () => {
    if (!data || !data.headers || !data.rows) {
      return <div className="p-4">No valid CSV data found</div>;
    }
    
    return (
      <div className="overflow-auto p-4 h-full w-full">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {data.headers.map((header: string, index: number) => (
                <th key={index} className="border px-4 py-2 text-left">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.slice(0, 100).map((row: string[], rowIndex: number) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="border px-4 py-2">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.rows.length > 100 && (
          <div className="mt-4 text-gray-500 text-sm">
            Showing first 100 rows of {data.rows.length} total rows
          </div>
        )}
      </div>
    );
  };
  
  const extension = file.details?.extension?.toLowerCase();
  
  switch (extension) {
    case 'json':
      return renderJsonData();
    case 'csv':
      return renderCsvData();
    default:
      return (
        <div className="flex items-center justify-center h-full">
          Preview not available for this data format
        </div>
      );
  }
};

export default DataPreview;
