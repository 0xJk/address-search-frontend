'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface GeocodeResult {
  standardized_address: string;
  latitude: number;
  longitude: number;
  gnaf_pid: string | null;
  confidence_score: number | null;
  metro_classification: string | null;
  geocode_source: string;
}

function MapPreview({ lat, lng, address }: { lat: number; lng: number; address: string }) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current || typeof google === 'undefined') return;

    const init = async () => {
      const { Map } = await google.maps.importLibrary('maps') as google.maps.MapsLibrary;
      const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary;

      const map = new Map(mapRef.current!, {
        center: { lat, lng },
        zoom: 16,
        mapId: 'DEMO_MAP_ID',
        mapTypeControl: false,
        streetViewControl: false,
      });

      const markerDiv = document.createElement('div');
      markerDiv.style.cssText =
        'width:16px;height:16px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.3)';

      new AdvancedMarkerElement({
        position: { lat, lng },
        map,
        title: address,
        content: markerDiv,
      });
    };

    init();
  }, [lat, lng, address]);

  return (
    <div
      ref={mapRef}
      className="w-full rounded-lg overflow-hidden border border-gray-200 mt-4"
      style={{ height: '300px' }}
    />
  );
}

export default function GeocodePage() {
  const [addressInput, setAddressInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeocodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addressInput.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'An error occurred. Please try again.');
        return;
      }

      setResult(data);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-gray-700 hover:text-blue-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            <span className="font-medium">Back to Search</span>
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-lg font-semibold text-gray-900">Geocode Tool</h1>
        </nav>

        <main className="max-w-2xl mx-auto px-4 py-10">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Address Standardisation</h2>
            <p className="text-gray-500 text-sm mb-6">
              Verify and standardise Australian addresses using the GNAF geocoding service.
            </p>

            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="Enter Australian address..."
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
                style={{ backgroundColor: '#1d4ed8' }}
              >
                {loading ? 'Looking up...' : 'Geocode'}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {result && (
              <div className="mt-6 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Standardised Address</span>
                    <p className="text-gray-900 font-medium mt-0.5">{result.standardized_address}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Latitude</span>
                      <p className="text-gray-900 mt-0.5">{result.latitude}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Longitude</span>
                      <p className="text-gray-900 mt-0.5">{result.longitude}</p>
                    </div>
                    {result.gnaf_pid && (
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">GNAF PID</span>
                        <p className="text-gray-900 font-mono text-sm mt-0.5">{result.gnaf_pid}</p>
                      </div>
                    )}
                    {result.confidence_score !== null && (
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confidence Score</span>
                        <p className="text-gray-900 mt-0.5">{result.confidence_score}</p>
                      </div>
                    )}
                    {result.metro_classification && (
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Metro Classification</span>
                        <p className="text-gray-900 mt-0.5">{result.metro_classification}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</span>
                      <p className="text-gray-900 mt-0.5">{result.geocode_source}</p>
                    </div>
                  </div>
                </div>
                <MapPreview
                  lat={result.latitude}
                  lng={result.longitude}
                  address={result.standardized_address}
                />
              </div>
            )}
          </div>
        </main>
    </div>
  );
}
