import SearchBar from '@/components/SearchBar';

export default function HomePage() {
  return (
    <>
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-3xl text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1d4ed8"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <h1 className="text-4xl font-bold" style={{ color: '#1e3a5f' }}>
              PropSearch AU
            </h1>
          </div>
          <p className="text-gray-500 text-lg mb-8">
            Search Australian property data, sale history, schools, and comparable sales.
          </p>
          <SearchBar variant="hero" />
          <p className="mt-4 text-sm text-gray-400">
            Enter a full Australian property address to get started
          </p>
        </div>
      </main>
    </>
  );
}

