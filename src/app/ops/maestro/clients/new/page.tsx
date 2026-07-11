/**
 * Create new client page
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import ClientForm from '../client-form';

export const metadata: Metadata = {
  title: 'Add Client - Maestro Admin',
  description: 'Add a new client',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AddClientPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Client</h1>
          <p className="text-gray-600 mt-1">Create a new client manually</p>
        </div>
        <Link href="/ops/maestro/clients">
          <Button className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2">
            ← Back to Clients
          </Button>
        </Link>
      </div>

      {/* Form */}
      <ClientForm />
    </div>
  );
}
