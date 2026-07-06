/**
 * Create new campaign page
 */

import { Metadata } from 'next';
import CampaignForm from '../campaign-form';

export const metadata: Metadata = {
  title: 'New Campaign - Maestro Admin',
  description: 'Create a new email campaign',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NewCampaignPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create Campaign</h1>
        <p className="text-gray-600 mt-1">Create a new email campaign</p>
      </div>

      {/* Form */}
      <CampaignForm />
    </div>
  );
}
