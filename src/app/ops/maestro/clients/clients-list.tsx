'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface Client {
  id: string;
  email: string;
  name?: string;
  company?: string;
  industry?: string;
  source?: string;
  last_emailed_at?: string;
  total_emails_sent: number;
  total_emails_failed: number;
  created_at: string;
}

interface ClientsListProps {
  source?: string;
  search?: string;
}

export default function ClientsList({ source, search }: ClientsListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 25;

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const url = new URL('/api/ops/maestro/clients', window.location.origin);
        if (source) {
          url.searchParams.set('source', source);
        }
        if (search) {
          url.searchParams.set('search', search);
        }
        url.searchParams.set('limit', limit.toString());
        url.searchParams.set('offset', offset.toString());

        const response = await fetch(url.toString());
        const data = await response.json();

        if (response.ok) {
          setClients(data.clients || []);
        } else {
          setError(data.error || 'Failed to load clients');
        }
      } catch (err) {
        setError('An error occurred while loading clients');
        console.error('[ClientsList] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchClients();
  }, [source, search, offset]);

  const getEmailStatusBadge = (client: Client) => {
    if (client.total_emails_sent === 0 && client.total_emails_failed === 0) {
      return <Badge variant="neutral">Never Emailed</Badge>;
    }

    if (client.total_emails_failed > 0 && client.total_emails_sent === 0) {
      return <Badge variant="error">All Failed</Badge>;
    }

    if (client.total_emails_failed > 0) {
      return <Badge variant="error">Failed Last</Badge>;
    }

    return <Badge variant="success">Emailed</Badge>;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Loading clients...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">No clients found</p>
        <Link href="/ops/maestro/clients/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">Add First Client</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-900">Name</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-900">Email</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-900">Company</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-900">Industry</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-900">Source</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-900">Email Status</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-900">Last Emailed</th>
              <th className="px-4 py-2 text-center font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">{client.name || '-'}</td>
                <td className="px-4 py-3 text-gray-900">{client.email}</td>
                <td className="px-4 py-3 text-gray-600">{client.company || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{client.industry || '-'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{client.source || '-'}</td>
                <td className="px-4 py-3">{getEmailStatusBadge(client)}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {formatDate(client.last_emailed_at)}
                </td>
                <td className="px-4 py-3 text-center">
                  <Link href={`/ops/maestro/clients/${client.id}`}>
                    <Button className="bg-gray-600 hover:bg-gray-700 text-white text-xs py-1 px-3">
                      View
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Pagination */}
      <Card className="p-4 flex items-center justify-between">
        <Button
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className="bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50"
        >
          Previous
        </Button>
        <span className="text-sm text-gray-600">
          Showing {offset + 1} - {offset + clients.length}
        </span>
        <Button
          onClick={() => setOffset(offset + limit)}
          disabled={clients.length < limit}
          className="bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50"
        >
          Next
        </Button>
      </Card>
    </div>
  );
}
