/**
 * Campaigns list page
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import CampaignsList from './campaigns-list';

export const metadata: Metadata = {
  title: 'Campaigns - Maestro Admin',
  description: 'Manage email campaigns',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-1">Manage your email campaigns</p>
        </div>
        <Link href="/ops/maestro/campaigns/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2">
            ✉️ New Campaign
          </Button>
        </Link>
      </div>

      {/* Tabs/Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Link href="/ops/maestro/campaigns">
            <Button className="bg-white hover:bg-gray-100 text-gray-900 border border-gray-300 px-4 py-2">
              All
            </Button>
          </Link>
          <Link href="/ops/maestro/campaigns?status=draft">
            <Button className="bg-white hover:bg-gray-100 text-gray-900 border border-gray-300 px-4 py-2">
              Draft
            </Button>
          </Link>
          <Link href="/ops/maestro/campaigns?status=completed">
            <Button className="bg-white hover:bg-gray-100 text-gray-900 border border-gray-300 px-4 py-2">
              Completed
            </Button>
          </Link>
        </div>
      </Card>

      {/* Campaigns List */}
      <CampaignsList />
    </div>
  );
}
