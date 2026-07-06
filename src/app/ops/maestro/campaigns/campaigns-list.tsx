'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  created_at: string;
  updated_at: string;
}

interface CampaignsListProps {
  status?: string;
}

export default function CampaignsList({ status }: CampaignsListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const url = new URL('/api/ops/maestro/campaigns', window.location.origin);
        if (status) {
          url.searchParams.set('status', status);
        }

        const response = await fetch(url.toString());
        const data = await response.json();

        if (response.ok) {
          setCampaigns(data.campaigns || []);
        } else {
          setError(data.error || 'Failed to load campaigns');
        }
      } catch (err) {
        setError('An error occurred while loading campaigns');
        console.error('[CampaignsList] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [status]);

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Loading campaigns...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">No campaigns found</p>
        <Link href="/ops/maestro/campaigns/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">Create First Campaign</Button>
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: string } = {
      draft: 'bg-yellow-100 text-yellow-800',
      scheduled: 'bg-blue-100 text-blue-800',
      sending: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };

    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <Card key={campaign.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Link
                  href={`/ops/maestro/campaigns/${campaign.id}`}
                  className="text-lg font-semibold text-blue-600 hover:text-blue-800"
                >
                  {campaign.name}
                </Link>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(campaign.status)}`}>
                  {campaign.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{campaign.subject}</p>
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <span>📧 {campaign.total_recipients} recipients</span>
                <span>✅ {campaign.successful_sends} sent</span>
                {campaign.failed_sends > 0 && <span>❌ {campaign.failed_sends} failed</span>}
                <span className="text-xs text-gray-500">
                  {new Date(campaign.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <Link href={`/ops/maestro/campaigns/${campaign.id}`}>
              <Button className="bg-gray-600 hover:bg-gray-700 text-white text-sm">
                View
              </Button>
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
