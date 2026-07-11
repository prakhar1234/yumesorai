/**
 * Clients list page
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import ClientsList from './clients-list';

export const metadata: Metadata = {
  title: 'Clients - Maestro Admin',
  description: 'Manage clients',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ClientsPage({
  searchParams,
}: {
  searchParams: { source?: string; search?: string };
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">Manage your clients and track email status</p>
        </div>
        <div className="flex gap-3">
          <Link href="/ops/maestro/clients/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2">
              ➕ Add Client
            </Button>
          </Link>
          <Link href="/ops/maestro/clients/bulk-upload">
            <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2">
              📤 Bulk Upload
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filters</label>
            <div className="flex gap-2 flex-wrap">
              <Link href="/ops/maestro/clients">
                <Button className={`px-4 py-2 text-sm ${
                  !searchParams.source
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
                }`}>
                  All Clients
                </Button>
              </Link>
              <Link href="/ops/maestro/clients?source=manual">
                <Button className={`px-4 py-2 text-sm ${
                  searchParams.source === 'manual'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
                }`}>
                  Manual
                </Button>
              </Link>
              <Link href="/ops/maestro/clients?source=csv_upload">
                <Button className={`px-4 py-2 text-sm ${
                  searchParams.source === 'csv_upload'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
                }`}>
                  CSV Upload
                </Button>
              </Link>
              <Link href="/ops/maestro/clients?source=contact_form">
                <Button className={`px-4 py-2 text-sm ${
                  searchParams.source === 'contact_form'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
                }`}>
                  Contact Form
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Clients List */}
      <ClientsList source={searchParams.source} search={searchParams.search} />
    </div>
  );
}
