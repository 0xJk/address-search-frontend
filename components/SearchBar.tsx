'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchBarProps {
  variant?: 'hero' | 'nav';
  defaultValue?: string;
}

export default function SearchBar({ variant = 'hero', defaultValue = '' }: SearchBarProps) {
  const [address, setAddress] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const fetchSuggestions = async (input: string) => {
    if (input.length < 3 || typeof google === 'undefined') {
      setSuggestions([]);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { AutocompleteSuggestion } = await google.maps.importLibrary('places') as any;
      const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        includedRegionCodes: ['au'],
        includedPrimaryTypes: ['address'],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSuggestions(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (response.suggestions as any[])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((s: any) => s.placePrediction?.text?.toString())
          .filter((s: string | undefined): s is string => !!s)
      );
    } catch {
      setSuggestions([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);
    setShowSuggestions(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSelect = (suggestion: string) => {
    setAddress(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    if (!address.trim()) return;
    setShowSuggestions(false);
    router.push(`/property?address=${encodeURIComponent(address.trim())}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const suggestionList =
    showSuggestions && suggestions.length > 0 ? (
      <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
        {suggestions.map((s, i) => (
          <li
            key={i}
            className="px-4 py-3 text-sm text-gray-900 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            onMouseDown={(e) => {
              e.preventDefault(); // prevent blur before click
              handleSelect(s);
            }}
          >
            {s}
          </li>
        ))}
      </ul>
    ) : null;

  if (variant === 'hero') {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div ref={containerRef} className="relative">
          <div className="flex items-center border border-gray-300 rounded-lg shadow-sm bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-700 focus-within:border-transparent">
            <input
              ref={inputRef}
              type="text"
              value={address}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Enter an Australian property address..."
              className="flex-1 px-4 py-4 text-base text-gray-900 outline-none bg-transparent placeholder-gray-400"
            />
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 px-6 py-4 bg-blue-700 text-white font-medium hover:bg-blue-800 transition-colors"
              style={{ backgroundColor: '#1d4ed8' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <span>Search</span>
            </button>
          </div>
          {suggestionList}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-80 lg:w-96">
      <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-700 focus-within:border-transparent">
        <input
          ref={inputRef}
          type="text"
          value={address}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="Search address..."
          className="flex-1 px-3 py-2 text-sm text-gray-900 outline-none bg-transparent placeholder-gray-400"
        />
        <button
          onClick={handleSearch}
          className="flex items-center px-3 py-2 text-gray-500 hover:text-blue-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      </div>
      {suggestionList}
    </div>
  );
}
