/**
 * Settings page with email configuration and user management
 */

import { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import EmailConfig from './email-config';
import UserManagement from './user-management';

export const metadata: Metadata = {
  title: 'Settings - Maestro Admin',
  description: 'Configure email settings and manage admin users',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure email settings and manage admin users</p>
      </div>

      {/* Email Configuration */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">📧 Email Configuration</h2>
        <EmailConfig />
      </section>

      {/* User Management */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">👥 Admin Users</h2>
        <UserManagement />
      </section>

      {/* Security Info */}
      <Card className="p-6 bg-blue-50 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">🔒 Security Information</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>✓ All passwords are hashed with bcrypt</li>
          <li>✓ Sessions are secured with JWT tokens</li>
          <li>✓ Login attempts are rate-limited</li>
          <li>✓ All API requests require authentication</li>
          <li>✓ Sensitive operations are logged</li>
        </ul>
      </Card>
    </div>
  );
}
