interface PropertyInfo {
  address?: string;
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
  gnaf_pid?: string | null;
  gnaf_matched?: boolean | null;
  gnaf_warning?: string | null;
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
        {propertyInfo.address && propertyInfo.address !== propertyInfo.standardized_address && (
          <p className="text-white/70 text-xs mt-1">Original: {propertyInfo.address}</p>
        )}
      </div>
      {propertyInfo.gnaf_warning && (
        <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {propertyInfo.gnaf_warning}
        </div>
      )}
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
            <InfoRow label="GNAF PID" value={propertyInfo.gnaf_pid} />
            <InfoRow
              label="GNAF Matched"
              value={propertyInfo.gnaf_matched === true ? 'Yes' : propertyInfo.gnaf_matched === false ? 'No' : null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
