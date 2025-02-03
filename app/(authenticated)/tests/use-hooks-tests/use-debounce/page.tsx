'use client';

import * as React from "react";
import { useDebounce } from "@uidotdev/usehooks";

interface HNResult {
  objectID: string;
  title: string;
  url: string;
}

interface SearchResultsProps {
  results: HNResult[];
}

const SearchResults: React.FC<SearchResultsProps> = ({ results }) => {
  if (!results.length) {
    return <p>No results found.</p>;
  }

  return (
    <ul>
      {results.map((result) => (
        <li key={result.objectID}>
          <a href={result.url} target="_blank" rel="noopener noreferrer">
            {result.title || "Untitled"}
          </a>
        </li>
      ))}
    </ul>
  );
};

const searchHackerNews = async (query: string): Promise<{ hits: HNResult[] }> => {
  try {
    const response = await fetch(`https://hn.algolia.com/api/v1/search?query=${query}`);
    if (!response.ok) {
      throw new Error("Failed to fetch results");
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
    return { hits: [] }; // Return an empty array on error
  }
};

export default function App() {
  const [searchTerm, setSearchTerm] = React.useState("js");
  const [results, setResults] = React.useState<HNResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    setSearchTerm(formData.get("search") as string);
    e.currentTarget.reset();
    e.currentTarget.focus();
  };

  React.useEffect(() => {
    const searchHN = async () => {
      let results: HNResult[] = [];
      setIsSearching(true);
      if (debouncedSearchTerm) {
        const data = await searchHackerNews(debouncedSearchTerm);
        results = data?.hits || [];
      }

      setIsSearching(false);
      setResults(results);
    };

    searchHN();
  }, [debouncedSearchTerm]);

  return (
    <section>
      <header>
        <h1>useDebounce</h1>
        <form onSubmit={handleSubmit}>
          <input
            name="search"
            placeholder="Search HN"
            style={{ background: "var(--charcoal)" }}
            onChange={handleChange}
          />
          <button className="primary" disabled={isSearching} type="submit">
            {isSearching ? "..." : "Search"}
          </button>
        </form>
      </header>
      <SearchResults results={results} />
    </section>
  );
}
