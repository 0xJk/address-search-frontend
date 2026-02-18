interface PropertyInfo {
  standardized_address: string;
  suburb: string;
  state: string;
  postcode: string;
  property_type: string | null;
  land_area: number | null;
  building_area: number | null;
  year_built: string | number | null;
  zoning: string | null;
  metro_classification: string | null;
  geocode_source: string;
  latitude: number | null;
  longitude: number | null;
}

interface PropertyInfoCardProps {
  propertyInfo: PropertyInfo;
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value !== null && value !== undefined && value !== '' ? String(value) : '—';
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      <span className="text-sm text-gray-900 text-right max-w-xs">{display}</span>
    </div>
  );
}

function formatGeocodeSource(source: string): string {
  if (source === 'GNAF' || source === 'CACHED') return 'GNAF';
  if (source === 'GOOGLE_API') return 'Google';
  return source;
}

export default function PropertyInfoCard({ propertyInfo }: PropertyInfoCardProps) {
  const yearBuilt = !propertyInfo.year_built ? '—' : String(propertyInfo.year_built);
  const propertyType = propertyInfo.property_type || 'Unknown';

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
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <h2 className="text-lg font-semibold text-white">Property Information</h2>
        </div>
        <p className="text-white/90 text-sm mt-1">{propertyInfo.standardized_address}</p>
      </div>
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <InfoRow label="Suburb" value={propertyInfo.suburb} />
            <InfoRow label="State" value={propertyInfo.state} />
            <InfoRow label="Postcode" value={propertyInfo.postcode} />
            <InfoRow label="Property Type" value={propertyType} />
            <InfoRow label="Year Built" value={yearBuilt} />
          </div>
          <div>
            <InfoRow
              label="Land Area"
              value={propertyInfo.land_area !== null ? `${propertyInfo.land_area} m²` : null}
            />
            <InfoRow
              label="Building Area"
              value={propertyInfo.building_area !== null ? `${propertyInfo.building_area} m²` : null}
            />
            <InfoRow label="Zoning" value={propertyInfo.zoning} />
            <InfoRow label="Metro Classification" value={propertyInfo.metro_classification} />
            <InfoRow
              label="Coordinate Source"
              value={formatGeocodeSource(propertyInfo.geocode_source)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
