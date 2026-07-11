/**
 * Bulk upload clients page
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import BulkUploadForm from '../bulk-upload-form';

export const metadata: Metadata = {
  title: 'Bulk Upload Clients - Maestro Admin',
  description: 'Bulk upload clients via CSV',
  robots: {
    index: false,
    follow: false,
  },
};

export default function BulkUploadPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bulk Upload Clients</h1>
          <p className="text-gray-600 mt-1">Import multiple clients via CSV file</p>
        </div>
        <Link href="/ops/maestro/clients">
          <Button className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2">
            ← Back to Clients
          </Button>
        </Link>
      </div>

      {/* Form */}
      <BulkUploadForm />
    </div>
  );
}
