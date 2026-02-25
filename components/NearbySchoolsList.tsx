interface School {
  school_name: string;
  school_type: string | null;
  school_sector: string | null;
  suburb?: string | null;
  distance_meters: number;
  rating_overall: number | null;
  rating_academic: number | null;
  phone: string | null;
  website_url: string | null;
}

interface NearbySchoolsListProps {
  schools: School[];
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function SchoolTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const colors: Record<string, string> = {
    Primary: 'bg-green-100 text-green-800',
    Secondary: 'bg-blue-100 text-blue-800',
    Combined: 'bg-purple-100 text-purple-800',
    Special: 'bg-orange-100 text-orange-800',
  };
  const color = colors[type] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {type}
    </span>
  );
}

function SectorBadge({ sector }: { sector: string | null }) {
  if (!sector) return null;
  const colors: Record<string, string> = {
    Government: 'bg-teal-100 text-teal-800',
    Catholic: 'bg-yellow-100 text-yellow-800',
    Independent: 'bg-pink-100 text-pink-800',
  };
  const color = colors[sector] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {sector}
    </span>
  );
}

export default function NearbySchoolsList({ schools }: NearbySchoolsListProps) {
  const sorted = [...schools].sort((a, b) => a.distance_meters - b.distance_meters);

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
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
          <h2 className="text-lg font-semibold text-white">Nearby Schools</h2>
        </div>
        <p className="text-white/80 text-sm mt-1">Within 2km radius</p>
      </div>

      {sorted.length === 0 ? (
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
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
          <p>No schools found within the search radius.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {sorted.map((school, index) => (
            <li key={index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{school.school_name}</span>
                    <SchoolTypeBadge type={school.school_type} />
                    <SectorBadge sector={school.school_sector} />
                  </div>
                  {school.suburb && (
                    <p className="text-xs text-gray-500 mt-0.5">{school.suburb}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                    {school.phone && (
                      <span className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4A2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9A16 16 0 0 0 15 16.09l1.95-1.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        {school.phone}
                      </span>
                    )}
                    {school.website_url && (
                      <a
                        href={school.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-700 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="2" y1="12" x2="22" y2="12" />
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                        Website
                      </a>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0 text-right">
                  <span className="text-sm font-medium text-gray-700">
                    {formatDistance(school.distance_meters)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
