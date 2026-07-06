'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';

interface Recipient {
  email: string;
  name?: string;
}

export default function CampaignForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [csvError, setCsvError] = useState('');

  const handleAddRecipient = () => {
    if (!manualEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(manualEmail)) {
      setError('Invalid email format');
      return;
    }

    if (recipients.some((r) => r.email === manualEmail)) {
      setError('Email already added');
      return;
    }

    setRecipients([...recipients, { email: manualEmail }]);
    setManualEmail('');
    setError('');
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r.email !== email));
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n');
    const newRecipients: Recipient[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Handle CSV format: email or email,name
      const parts = trimmed.split(',');
      const email = parts[0].trim();
      const recipientName = parts[1]?.trim() || undefined;

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setCsvError(`Invalid email: ${email}`);
        return;
      }

      if (!recipients.some((r) => r.email === email) && !newRecipients.some((r) => r.email === email)) {
        newRecipients.push({ email, name: recipientName });
      }
    }

    setRecipients([...recipients, ...newRecipients]);
    setCsvError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!name || !subject || !content) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (recipients.length === 0) {
      setError('Please add at least one recipient');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/ops/maestro/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          subject,
          content,
          from_email: fromEmail || undefined,
          recipients,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create campaign');
        return;
      }

      router.push(`/ops/maestro/campaigns/${data.campaign.id}`);
      router.refresh();
    } catch (err) {
      setError('An error occurred while creating the campaign');
      console.error('[CampaignForm] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {/* Campaign Details */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Details</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name *
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome Email Campaign"
              disabled={loading}
              required
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Email Subject *
            </label>
            <Input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Welcome to our platform!"
              disabled={loading}
              required
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="fromEmail" className="block text-sm font-medium text-gray-700 mb-1">
              From Email (Optional)
            </label>
            <Input
              id="fromEmail"
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="noreply@example.com"
              disabled={loading}
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Email Content (HTML) *
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter HTML content for the email..."
              disabled={loading}
              required
              className="w-full h-48"
            />
          </div>
        </div>
      </Card>

      {/* Recipients */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipients</h3>

        <div className="space-y-4">
          {/* Manual Entry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Add Email Manually</label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="email@example.com"
                disabled={loading}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleAddRecipient}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Add
              </Button>
            </div>
          </div>

          {/* CSV Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Or Upload CSV</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                disabled={loading}
                className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">CSV format: email@example.com or email@example.com,Name</p>
            {csvError && <p className="text-xs text-red-600 mt-1">{csvError}</p>}
          </div>

          {/* Recipients List */}
          {recipients.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipients ({recipients.length})
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-50 p-3 rounded-md border border-gray-200">
                {recipients.map((recipient) => (
                  <div key={recipient.email} className="flex items-center justify-between bg-white p-2 rounded">
                    <span className="text-sm">
                      {recipient.name ? `${recipient.name} (${recipient.email})` : recipient.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(recipient.email)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Submit */}
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
        >
          {loading ? 'Creating...' : 'Create Campaign'}
        </Button>
        <Button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
