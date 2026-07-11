/**
 * Client detail page
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import ClientForm from '../client-form';

interface Client {
  id: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  industry?: string;
  source?: string;
  tags?: string[];
  notes?: string;
  last_emailed_at?: string;
  total_emails_sent: number;
  total_emails_failed: number;
  created_at: string;
  updated_at: string;
}

interface EmailHistoryItem {
  id: string;
  campaign_name?: string;
  status: string;
  sent_at?: string;
  error_message?: string;
  created_at: string;
}

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [emailHistory, setEmailHistory] = useState<EmailHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const response = await fetch(`/api/ops/maestro/clients/${params.id}`);

        if (!response.ok) {
          setError('Client not found');
          return;
        }

        const data = await response.json();
        setClient(data.client);
        setEmailHistory(data.emailHistory || []);
      } catch (err) {
        setError('Failed to load client');
        console.error('[ClientDetail] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [params.id]);

  const handleDelete = async () => {
    if (!client) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/ops/maestro/clients/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/ops/maestro/clients');
        router.refresh();
      } else {
        setError('Failed to delete client');
      }
    } catch (err) {
      setError('An error occurred while deleting');
      console.error('[ClientDetail] Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: any } = {
      sent: { variant: 'success', label: 'Sent' },
      pending: { variant: 'warning', label: 'Pending' },
      failed: { variant: 'error', label: 'Failed' },
    };

    const badge = badges[status] || { variant: 'neutral', label: status };
    return <Badge variant={badge.variant as any}>{badge.label}</Badge>;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Loading client...</div>;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/ops/maestro/clients">
            <Button className="bg-gray-600 hover:bg-gray-700 text-white">
              ← Back to Clients
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  if (editMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Edit Client</h1>
          <Button
            onClick={() => setEditMode(false)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2"
          >
            ← Back
          </Button>
        </div>
        <ClientForm
          initialData={client}
          isEdit={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{client.name || client.email}</h1>
          <p className="text-gray-600 mt-1">{client.email}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/ops/maestro/clients">
            <Button className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2">
              ← Back
            </Button>
          </Link>
          <Button
            onClick={() => setEditMode(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            ✏️ Edit
          </Button>
          <Button
            onClick={() => setDeleteConfirm(!deleteConfirm)}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
          >
            🗑️ Delete
          </Button>
        </div>
      </div>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <p className="text-sm text-red-700 mb-3">Are you sure you want to delete this client?</p>
          <div className="flex gap-2">
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-3"
            >
              {deleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
            <Button
              onClick={() => setDeleteConfirm(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white text-sm py-1 px-3"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Client Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h3>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium text-gray-900">{client.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="font-medium text-gray-900">{client.name || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Company</p>
            <p className="font-medium text-gray-900">{client.company || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="font-medium text-gray-900">{client.phone || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Industry</p>
            <p className="font-medium text-gray-900">{client.industry || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Source</p>
            <p className="font-medium text-gray-900 capitalize">{client.source || '-'}</p>
          </div>
          {client.tags && client.tags.length > 0 && (
            <div>
              <p className="text-sm text-gray-600">Tags</p>
              <div className="flex flex-wrap gap-2">
                {client.tags.map((tag, idx) => (
                  <Badge key={idx} variant="neutral">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
          {client.notes && (
            <div className="col-span-2">
              <p className="text-sm text-gray-600">Notes</p>
              <p className="font-medium text-gray-900">{client.notes}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Email Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-6">
          <p className="text-sm text-gray-600">Total Emails Sent</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{client.total_emails_sent}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Failed Emails</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{client.total_emails_failed}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Last Emailed</p>
          <p className="text-lg font-bold text-gray-900 mt-2">{formatDate(client.last_emailed_at)}</p>
        </Card>
      </div>

      {/* Email History */}
      {emailHistory.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Email History</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Campaign</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Status</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Sent At</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Error Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {emailHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{item.campaign_name || 'Unknown'}</td>
                    <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {item.sent_at ? new Date(item.sent_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{item.error_message || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* No Email History */}
      {emailHistory.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-gray-600">This client has not received any emails yet.</p>
        </Card>
      )}
    </div>
  );
}
