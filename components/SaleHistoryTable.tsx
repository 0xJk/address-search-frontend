'use client';

import { useState } from 'react';

interface SaleRecord {
  sale_date: string;
  sale_price: number | null;
  sale_method: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  car_spaces: number | null;
  days_on_market: number | null;
  agent_name: string | null;
  agency_name: string | null;
  property_description: string | null;
}

interface SaleHistoryTableProps {
  saleHistory: SaleRecord[];
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

function DescriptionRow({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const preview = description.length > 150 ? description.slice(0, 150) + '...' : description;

  return (
    <div className="mt-1">
      <p className="text-xs text-gray-500">{expanded ? description : preview}</p>
      {description.length > 150 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-700 hover:underline mt-1"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

export default function SaleHistoryTable({ saleHistory }: SaleHistoryTableProps) {
  const sorted = [...saleHistory].sort(
    (a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
  );

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
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <h2 className="text-lg font-semibold text-white">Sale History</h2>
        </div>
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
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p>No sale history available for this property.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Method</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Beds / Baths / Cars</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Days on Market</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Agent / Agency</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 text-gray-900 whitespace-nowrap">
                    {formatDate(record.sale_date)}
                  </td>
                  <td className="px-4 py-4 font-medium text-gray-900 whitespace-nowrap">
                    {formatPrice(record.sale_price)}
                  </td>
                  <td className="px-4 py-4 text-gray-700">{record.sale_method || '—'}</td>
                  <td className="px-4 py-4 text-gray-700">
                    {[
                      record.bedrooms !== null ? `${record.bedrooms} bd` : null,
                      record.bathrooms !== null ? `${record.bathrooms} ba` : null,
                      record.car_spaces !== null ? `${record.car_spaces} car` : null,
                    ]
                      .filter(Boolean)
                      .join(' / ') || '—'}
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    {record.days_on_market !== null ? `${record.days_on_market} days` : '—'}
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    <div>{record.agent_name || '—'}</div>
                    {record.agency_name ? (
                      <div className="text-xs text-gray-500">{record.agency_name}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-gray-700 max-w-xs">
                    {record.property_description ? (
                      <DescriptionRow description={record.property_description} />
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
