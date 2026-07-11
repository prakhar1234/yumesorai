'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';

interface ClientFormProps {
  initialData?: {
    id?: string;
    email?: string;
    name?: string;
    company?: string;
    phone?: string;
    industry?: string;
    tags?: string[];
    notes?: string;
  };
  isEdit?: boolean;
}

export default function ClientForm({ initialData, isEdit = false }: ClientFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialData?.email || '');
  const [name, setName] = useState(initialData?.name || '');
  const [company, setCompany] = useState(initialData?.company || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [industry, setIndustry] = useState(initialData?.industry || '');
  const [tags, setTags] = useState((initialData?.tags || []).join(', '));
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [duplicateClientId, setDuplicateClientId] = useState('');

  const industryOptions = [
    { label: 'Technology', value: 'Technology' },
    { label: 'Finance', value: 'Finance' },
    { label: 'Healthcare', value: 'Healthcare' },
    { label: 'Retail', value: 'Retail' },
    { label: 'Manufacturing', value: 'Manufacturing' },
    { label: 'Education', value: 'Education' },
    { label: 'Real Estate', value: 'Real Estate' },
    { label: 'Hospitality', value: 'Hospitality' },
    { label: 'Transportation', value: 'Transportation' },
    { label: 'Other', value: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDuplicateClientId('');
    setLoading(true);

    if (!email) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Invalid email format');
      setLoading(false);
      return;
    }

    try {
      const url = isEdit
        ? `/api/ops/maestro/clients/${initialData?.id}`
        : '/api/ops/maestro/clients';

      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: isEdit ? undefined : email,
          name: name || undefined,
          company: company || undefined,
          phone: phone || undefined,
          industry: industry || undefined,
          tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError('Email already exists');
          setDuplicateClientId(data.clientId || '');
        } else {
          setError(data.error || 'Failed to save client');
        }
        return;
      }

      const clientId = isEdit ? initialData?.id : data.client.id;
      router.push(`/ops/maestro/clients/${clientId}`);
      router.refresh();
    } catch (err) {
      setError('An error occurred while saving the client');
      console.error('[ClientForm] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
          {duplicateClientId && (
            <Link href={`/ops/maestro/clients/${duplicateClientId}`}>
              <Button className="mt-2 bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-3">
                View Existing Client
              </Button>
            </Link>
          )}
        </Card>
      )}

      {/* Basic Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address * {isEdit && '(cannot be changed)'}
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isEdit}
              placeholder="client@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <Input
              id="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Inc."
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Industry
            </label>
            <Select
              value={industry}
              onValueChange={setIndustry}
              options={industryOptions}
              placeholder="Select an industry"
            />
          </div>
        </div>
      </Card>

      {/* Additional Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <Input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="vip, premium, partner"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this client..."
              rows={4}
            />
          </div>
        </div>
      </Card>

      {/* Form Actions */}
      <Card className="p-4 bg-gray-50 flex gap-3 justify-end">
        <Link href="/ops/maestro/clients">
          <Button className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2">
            Cancel
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 disabled:opacity-50"
        >
          {loading ? 'Saving...' : isEdit ? 'Update Client' : 'Create Client'}
        </Button>
      </Card>
    </form>
  );
}
