'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchBarProps {
  variant?: 'hero' | 'nav';
  defaultValue?: string;
}

export default function SearchBar({ variant = 'hero', defaultValue = '' }: SearchBarProps) {
  const [address, setAddress] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!inputRef.current || typeof google === 'undefined') return;

    let autocomplete: google.maps.places.Autocomplete | null = null;

    const init = async () => {
      const { Autocomplete } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
      if (!inputRef.current) return;

      autocomplete = new Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'au' },
        types: ['address'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete!.getPlace();
        if (place.formatted_address) {
          setAddress(place.formatted_address);
        }
      });

      autocompleteRef.current = autocomplete;
    };

    init();

    return () => {
      if (autocomplete) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, []);

  const handleSearch = () => {
    if (!address.trim()) return;
    router.push(`/property?address=${encodeURIComponent(address.trim())}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (variant === 'hero') {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center border border-gray-300 rounded-lg shadow-sm bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-700 focus-within:border-transparent">
          <input
            ref={inputRef}
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={handleKeyDown}
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
      </div>
    );
  }

  return (
    <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-700 focus-within:border-transparent w-80 lg:w-96">
      <input
        ref={inputRef}
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        onKeyDown={handleKeyDown}
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
  );
}
