'use client';

import Link from 'next/link';
import SearchBar from './SearchBar';

interface NavbarProps {
  defaultAddress?: string;
}

export default function Navbar({ defaultAddress }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className="text-lg font-bold text-gray-900" style={{ color: '#1e3a5f' }}>
                PropSearch AU
              </span>
            </div>
          </Link>
          <div className="flex-1 flex justify-center">
            <SearchBar variant="nav" defaultValue={defaultAddress} />
          </div>
          <div className="flex-shrink-0 w-32 hidden lg:block" />
        </div>
      </div>
    </nav>
  );
}
