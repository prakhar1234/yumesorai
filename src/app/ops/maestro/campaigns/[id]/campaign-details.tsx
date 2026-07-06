'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  from_email: string;
  status: string;
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  scheduled_at: string;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

interface Recipient {
  id: string;
  email: string;
  name: string;
  status: string;
  message_id: string;
  error_message: string;
  sent_at: string;
}

interface CampaignData {
  campaign: Campaign;
  recipients: Recipient[];
}

export default function CampaignDetails() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendLoading, setSendLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const response = await fetch(`/api/ops/maestro/campaigns/${campaignId}`);
        const data: CampaignData = await response.json();

        if (response.ok) {
          setCampaign(data.campaign);
          setRecipients(data.recipients || []);
        } else {
          setError(data as any || 'Failed to load campaign');
        }
      } catch (err) {
        setError('An error occurred while loading the campaign');
        console.error('[CampaignDetails] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId]);

  const handleSend = async () => {
    if (!campaign) return;

    setSendLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`/api/ops/maestro/campaigns/${campaignId}/send`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send campaign');
        return;
      }

      setSuccessMessage(data.message || 'Campaign sent successfully');
      // Refresh campaign data
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      setError('An error occurred while sending the campaign');
      console.error('[CampaignDetails] Send error:', err);
    } finally {
      setSendLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!campaign) return;

    if (!confirm('Are you sure you want to delete this campaign?')) {
      return;
    }

    setDeleteLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/ops/maestro/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to delete campaign');
        return;
      }

      router.push('/ops/maestro/campaigns');
      router.refresh();
    } catch (err) {
      setError('An error occurred while deleting the campaign');
      console.error('[CampaignDetails] Delete error:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Loading campaign...</div>;
  }

  if (error && !campaign) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  if (!campaign) {
    return <div className="text-center py-8 text-gray-600">Campaign not found</div>;
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

  const getRecipientStatusBadge = (status: string) => {
    const badges: { [key: string]: string } = {
      pending: 'bg-gray-100 text-gray-800',
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };

    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
          <div className="flex items-center gap-3 mt-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(campaign.status)}`}>
              {campaign.status}
            </span>
            <span className="text-sm text-gray-600">
              Created {new Date(campaign.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === 'draft' && (
            <>
              <Button
                onClick={handleSend}
                disabled={sendLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {sendLoading ? 'Sending...' : '📤 Send'}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteLoading ? 'Deleting...' : '🗑️ Delete'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {successMessage && (
        <Card className="p-4 bg-green-50 border border-green-200">
          <p className="text-sm text-green-700">{successMessage}</p>
        </Card>
      )}

      {/* Campaign Details */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Subject</p>
            <p className="font-medium text-gray-900">{campaign.subject}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">From Email</p>
            <p className="font-medium text-gray-900">{campaign.from_email || 'Default'}</p>
          </div>
        </div>
      </Card>

      {/* Content */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Content</h2>
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <div className="text-sm text-gray-600 whitespace-pre-wrap break-words">
            {campaign.content}
          </div>
        </div>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-blue-50 border-l-4 border-blue-600">
          <p className="text-sm text-gray-600">Total Recipients</p>
          <p className="text-3xl font-bold text-blue-900">{campaign.total_recipients}</p>
        </Card>
        <Card className="p-6 bg-green-50 border-l-4 border-green-600">
          <p className="text-sm text-gray-600">Successful Sends</p>
          <p className="text-3xl font-bold text-green-900">{campaign.successful_sends}</p>
        </Card>
        <Card className="p-6 bg-red-50 border-l-4 border-red-600">
          <p className="text-sm text-gray-600">Failed Sends</p>
          <p className="text-3xl font-bold text-red-900">{campaign.failed_sends}</p>
        </Card>
      </div>

      {/* Recipients Table */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recipients ({recipients.length})</h2>
        {recipients.length === 0 ? (
          <p className="text-gray-600">No recipients</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recipients.slice(0, 50).map((recipient) => (
                  <tr key={recipient.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{recipient.email}</td>
                    <td className="px-4 py-3">{recipient.name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRecipientStatusBadge(recipient.status)}`}>
                        {recipient.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {recipient.sent_at ? new Date(recipient.sent_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recipients.length > 50 && (
              <p className="text-sm text-gray-600 mt-4">Showing 50 of {recipients.length} recipients</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
