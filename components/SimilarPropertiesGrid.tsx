'use client';

import { useRouter } from 'next/navigation';

interface SimilarProperty {
  address: string;
  suburb?: string | null;
  distance_meters: number;
  sale_date: string;
  sale_price: number | null;
  sale_method: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  car_spaces: number | null;
  land_area: number | null;
  building_area: number | null;
  property_type: string | null;
}

interface SimilarPropertiesGridProps {
  properties: SimilarProperty[];
}

function formatPrice(price: number | null): string {
  if (price === null) return 'Contact Agent';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(price);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export default function SimilarPropertiesGrid({ properties }: SimilarPropertiesGridProps) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100" style={{ backgroundColor: '#1e3a5f' }}>
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="1" y="3" width="15" height="13" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          <h2 className="text-lg font-semibold text-white">Nearby Similar Properties</h2>
        </div>
        <p className="text-white/80 text-sm mt-1">Comparable sales within 2km</p>
      </div>

      {properties.length === 0 ? (
        <div className="px-6 py-10 text-center text-gray-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36"
            height="36"
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
          <p>No similar properties found nearby.</p>
        </div>
      ) : (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property, index) => (
            <div
              key={index}
              onClick={() => router.push(`/property?address=${encodeURIComponent(property.address)}`)}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 leading-snug">
                    {property.address}
                  </p>
                  {property.suburb && (
                    <p className="text-xs text-gray-500 mt-0.5">{property.suburb}</p>
                  )}
                </div>
                <span className="ml-2 flex-shrink-0 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {formatDistance(property.distance_meters)}
                </span>
              </div>

              <div className="text-lg font-semibold mb-2" style={{ color: '#1d4ed8' }}>
                {formatPrice(property.sale_price)}
              </div>

              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Sold</span>
                  <span>{formatDate(property.sale_date)}</span>
                </div>
                {property.sale_method && (
                  <div className="flex justify-between">
                    <span>Method</span>
                    <span>{property.sale_method}</span>
                  </div>
                )}
                {property.property_type && (
                  <div className="flex justify-between">
                    <span>Type</span>
                    <span>{property.property_type}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-600">
                {property.bedrooms !== null && (
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 16h20M6 8v8M18 2H9v6" />
                    </svg>
                    {property.bedrooms} bd
                  </span>
                )}
                {property.bathrooms !== null && (
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
                      <line x1="10" y1="5" x2="8" y2="7" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                    </svg>
                    {property.bathrooms} ba
                  </span>
                )}
                {property.car_spaces !== null && (
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="3" width="15" height="13" />
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                      <circle cx="5.5" cy="18.5" r="2.5" />
                      <circle cx="18.5" cy="18.5" r="2.5" />
                    </svg>
                    {property.car_spaces} car
                  </span>
                )}
              </div>

              {(property.land_area !== null || property.building_area !== null) && (
                <div className="mt-2 flex gap-3 text-xs text-gray-500">
                  {property.land_area !== null && <span>Land: {property.land_area} m²</span>}
                  {property.building_area !== null && <span>Build: {property.building_area} m²</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
