'use client';

import { useEffect, useRef } from 'react';

interface PropertyMapProps {
  lat: number | null;
  lng: number | null;
  address?: string;
}

export default function PropertyMap({ lat, lng, address }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || lat === null || lng === null) return;
    if (typeof google === 'undefined') return;

    const init = async () => {
      const { Map } = await google.maps.importLibrary('maps') as google.maps.MapsLibrary;
      const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary;

      const map = new Map(mapRef.current!, {
        center: { lat, lng },
        zoom: 16,
        mapId: 'DEMO_MAP_ID',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      const markerDiv = document.createElement('div');
      markerDiv.style.cssText =
        'width:20px;height:20px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.3)';

      new AdvancedMarkerElement({
        position: { lat, lng },
        map,
        title: address,
        content: markerDiv,
      });

      mapInstanceRef.current = map;
    };

    init();
  }, [lat, lng, address]);

  if (lat === null || lng === null) {
    return (
      <div className="w-full bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center" style={{ height: '450px' }}>
        <div className="text-center text-gray-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-2"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <p>Map location not available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full rounded-lg overflow-hidden border border-gray-200"
      style={{ height: '450px' }}
    />
  );
}
