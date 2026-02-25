import Link from 'next/link'

export default function RateLimitedPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            Too Many Requests
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            You have made too many requests. Please wait a few minutes before trying again.
          </p>

          <Link
            href="/"
            className="inline-block py-2.5 px-6 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#1d4ed8' }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
}
