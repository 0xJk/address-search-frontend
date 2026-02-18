import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import PropertyMap from '@/components/PropertyMap';
import PropertyInfoCard from '@/components/PropertyInfoCard';
import SaleHistoryTable from '@/components/SaleHistoryTable';
import SimilarPropertiesGrid from '@/components/SimilarPropertiesGrid';
import NearbySchoolsList from '@/components/NearbySchoolsList';
import RawResponseViewer from '@/components/RawResponseViewer';

interface PropertyPageProps {
  searchParams: Promise<{ address?: string }>;
}

interface ApiError {
  error: string;
}

async function fetchPropertyData(address: string) {
  const apiUrl = process.env.ADDRESS_API_URL;
  const apiKey = process.env.ADDRESS_API_KEY;

  if (!apiUrl || !apiKey) {
    return { data: { error: 'Server configuration error' }, status: 500 };
  }

  const params = new URLSearchParams({
    address,
    include_nearby: 'true',
    radius_meters: '2000',
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${apiUrl}/api/v1/property/search?${params}`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return { data: { error: 'Address not found. Please verify and try again.' }, status: 404 };
    }

    if (!response.ok) {
      return { data: { error: 'An error occurred. Please try again later.' }, status: response.status };
    }

    const data = await response.json();
    return { data, status: 200 };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { data: { error: 'Request timed out. Please try again later.' }, status: 408 };
    }
    return { data: { error: 'An error occurred. Please try again later.' }, status: 500 };
  }
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Search Error</h2>
        <p className="text-gray-500">{message}</p>
        <a
          href="/"
          className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors hover:opacity-90"
          style={{ backgroundColor: '#1d4ed8' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to Search
        </a>
      </div>
    </div>
  );
}

export default async function PropertyPage({ searchParams }: PropertyPageProps) {
  const params = await searchParams;
  const address = params.address ? decodeURIComponent(params.address) : null;

  if (!address) {
    notFound();
  }

  const { data, status } = await fetchPropertyData(address);

  const errorMessages: Record<number, string> = {
    404: 'Address not found. Please verify the address and try again.',
    408: 'Request timed out. Please try again later.',
    500: 'An error occurred. Please try again later.',
  };

  if (status !== 200) {
    const errorData = data as ApiError;
    const message = errorData?.error || errorMessages[status] || 'An error occurred. Please try again later.';
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar defaultAddress={address} />
        <div className="pt-16">
          <ErrorState message={message} />
        </div>
      </div>
    );
  }

  const propertyInfo = data?.data?.property_info;
  const saleHistory = data?.data?.sale_history ?? [];
  const similarProperties = data?.data?.similar_properties_nearby ?? [];
  const nearbySchools = data?.data?.nearby_schools ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
        <Navbar defaultAddress={address} />
        <div className="pt-16">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Section 1 — Map */}
            <section>
              <PropertyMap
                lat={propertyInfo?.latitude ?? null}
                lng={propertyInfo?.longitude ?? null}
                address={propertyInfo?.standardized_address}
              />
            </section>

            {/* Section 2 — Property Info Card */}
            {propertyInfo && (
              <section>
                <PropertyInfoCard propertyInfo={propertyInfo} />
              </section>
            )}

            {/* Section 3 — Sale History */}
            <section>
              <SaleHistoryTable saleHistory={saleHistory} />
            </section>

            {/* Section 4 — Similar Properties */}
            <section>
              <SimilarPropertiesGrid properties={similarProperties} />
            </section>

            {/* Section 5 — Nearby Schools */}
            <section>
              <NearbySchoolsList schools={nearbySchools} />
            </section>

            {/* Section 6 — Transport (Coming Soon) */}
            <section>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#6b7280"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="1" y="3" width="15" height="13" />
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                      <circle cx="5.5" cy="18.5" r="2.5" />
                      <circle cx="18.5" cy="18.5" r="2.5" />
                    </svg>
                    <h2 className="text-lg font-semibold text-gray-700">Nearby Transport</h2>
                  </div>
                </div>
                <div className="px-6 py-10 text-center text-gray-400">
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
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <p className="font-medium">Coming Soon</p>
                  <p className="text-sm mt-1">Public transport data will be available soon.</p>
                </div>
              </div>
            </section>

            {/* Section 7 — Raw Response */}
            <section>
              <RawResponseViewer data={data?.data} />
            </section>
          </main>
        </div>
      </div>
  );
}
