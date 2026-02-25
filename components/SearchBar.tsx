'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AddressValidationDialog from '@/components/AddressValidationDialog';

interface SearchBarProps {
  variant?: 'hero' | 'nav';
  defaultValue?: string;
}

export default function SearchBar({ variant = 'hero', defaultValue = '' }: SearchBarProps) {
  const [address, setAddress] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [correctedAddress, setCorrectedAddress] = useState<string | null>(null);
  const [pendingOriginalAddress, setPendingOriginalAddress] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

  const navigateToProperty = (addr: string) => {
    const cleaned = addr.replace(/,?\s*australia$/i, '').trim();
    router.push(`/property?address=${encodeURIComponent(cleaned)}`);
  };

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
      });

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
    setValidationError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSelect = (suggestion: string) => {
    setAddress(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    setValidationError(null);
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

  const handleSearch = async () => {
    const trimmed = address.trim();
    if (!trimmed) return;
    setShowSuggestions(false);
    setValidationError(null);

    // Cancel previous in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsValidating(true);

    try {
      const res = await fetch('/api/validate-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: trimmed }),
        signal: controller.signal,
      });

      if (!res.ok) {
        // Fail open: navigate with original address
        navigateToProperty(trimmed);
        return;
      }

      const data = await res.json();

      if (!data.isValid || !data.formattedAddress) {
        setValidationError('This address could not be validated. Please check and try again.');
        return;
      }

      if (data.hasReplacedComponents || data.hasSpellCorrectedComponents) {
        setPendingOriginalAddress(trimmed);
        setCorrectedAddress(data.formattedAddress);
        setShowCorrectionDialog(true);
        return;
      }

      // Valid, no corrections — navigate with formatted address
      navigateToProperty(data.formattedAddress);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      // Fail open: navigate with original address
      navigateToProperty(trimmed);
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSelectCorrected = () => {
    setShowCorrectionDialog(false);
    if (correctedAddress) {
      navigateToProperty(correctedAddress);
    }
  };

  const handleSelectOriginal = () => {
    setShowCorrectionDialog(false);
    navigateToProperty(pendingOriginalAddress);
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

  const searchIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={variant === 'hero' ? '20' : '16'}
      height={variant === 'hero' ? '20' : '16'}
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
  );

  const spinnerIcon = (
    <svg
      className="animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      width={variant === 'hero' ? '20' : '16'}
      height={variant === 'hero' ? '20' : '16'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );

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
              disabled={isValidating}
              className="flex items-center gap-2 px-6 py-4 bg-blue-700 text-white font-medium hover:bg-blue-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#1d4ed8' }}
            >
              {isValidating ? spinnerIcon : searchIcon}
              <span>{isValidating ? 'Validating...' : 'Search'}</span>
            </button>
          </div>
          {suggestionList}
          {validationError && (
            <p className="mt-2 text-sm text-red-600">{validationError}</p>
          )}
        </div>
        <AddressValidationDialog
          open={showCorrectionDialog}
          onOpenChange={setShowCorrectionDialog}
          originalAddress={pendingOriginalAddress}
          correctedAddress={correctedAddress || ''}
          onSelectOriginal={handleSelectOriginal}
          onSelectCorrected={handleSelectCorrected}
        />
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
          disabled={isValidating}
          className="flex items-center px-3 py-2 text-gray-500 hover:text-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isValidating ? spinnerIcon : searchIcon}
        </button>
      </div>
      {suggestionList}
      {validationError && (
        <p className="mt-2 text-sm text-red-600">{validationError}</p>
      )}
      <AddressValidationDialog
        open={showCorrectionDialog}
        onOpenChange={setShowCorrectionDialog}
        originalAddress={pendingOriginalAddress}
        correctedAddress={correctedAddress || ''}
        onSelectOriginal={handleSelectOriginal}
        onSelectCorrected={handleSelectCorrected}
      />
    </div>
  );
}
