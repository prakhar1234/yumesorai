/**
 * Dashboard overview page
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import OverviewStats from './overview-stats';

export const metadata: Metadata = {
  title: 'Dashboard - Maestro Admin',
  description: 'Email management admin dashboard',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome to the Maestro email management system</p>
        </div>
      </div>

      {/* Statistics */}
      <OverviewStats />

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/ops/maestro/campaigns/new">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md transition">
              ✉️ New Campaign
            </Button>
          </Link>
          <Link href="/ops/maestro/campaigns">
            <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-md transition">
              📧 View Campaigns
            </Button>
          </Link>
          <Link href="/ops/maestro/settings">
            <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-md transition">
              ⚙️ Settings
            </Button>
          </Link>
        </div>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border-l-4 border-blue-600">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">📧 Email Campaigns</h3>
          <p className="text-sm text-gray-600">
            Create and manage bulk email campaigns. Easily configure recipients, track delivery
            status, and monitor campaign performance.
          </p>
        </Card>

        <Card className="p-6 border-l-4 border-green-600">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">⚙️ Configuration</h3>
          <p className="text-sm text-gray-600">
            Configure email settings, set up rate limits, and manage admin users. Control who
            has access to the system.
          </p>
        </Card>
      </div>

      {/* System Info */}
      <Card className="p-6 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">System Information</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>✓ Secure authentication with JWT tokens</li>
          <li>✓ Rate limiting to prevent abuse</li>
          <li>✓ Comprehensive audit logs</li>
          <li>✓ Role-based access control</li>
        </ul>
      </Card>
    </div>
  );
}
