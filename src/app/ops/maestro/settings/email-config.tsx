'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';

interface EmailConfig {
  auto_email_enabled: boolean;
  default_from_email: string;
  default_subject: string;
  default_content: string;
  rate_limit_per_hour: number;
  updated_at: string;
}

export default function EmailConfig() {
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/ops/maestro/config/email');
        const data = await response.json();

        if (response.ok) {
          setConfig(data.config);
        } else {
          setError(data.error || 'Failed to load configuration');
        }
      } catch (err) {
        setError('An error occurred while loading configuration');
        console.error('[EmailConfig] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/ops/maestro/config/email', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save configuration');
        return;
      }

      setSuccessMessage('Configuration saved successfully');
      setConfig(data.config);
    } catch (err) {
      setError('An error occurred while saving configuration');
      console.error('[EmailConfig] Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Loading configuration...</div>;
  }

  if (!config) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Email Configuration</h2>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md mb-6">
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <input
            type="checkbox"
            id="auto_email_enabled"
            checked={config.auto_email_enabled}
            onChange={(e) =>
              setConfig({ ...config, auto_email_enabled: e.target.checked })
            }
            disabled={saving}
            className="w-5 h-5 text-blue-600"
          />
          <label htmlFor="auto_email_enabled" className="text-sm font-medium text-gray-900 cursor-pointer">
            Enable Automatic Email Sending
          </label>
        </div>

        <div>
          <label htmlFor="from_email" className="block text-sm font-medium text-gray-700 mb-2">
            Default From Email
          </label>
          <Input
            id="from_email"
            type="email"
            value={config.default_from_email || ''}
            onChange={(e) =>
              setConfig({ ...config, default_from_email: e.target.value })
            }
            placeholder="noreply@example.com"
            disabled={saving}
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
            Default Email Subject
          </label>
          <Input
            id="subject"
            type="text"
            value={config.default_subject || ''}
            onChange={(e) =>
              setConfig({ ...config, default_subject: e.target.value })
            }
            placeholder="Email subject..."
            disabled={saving}
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            Default Email Content (HTML)
          </label>
          <Textarea
            id="content"
            value={config.default_content || ''}
            onChange={(e) =>
              setConfig({ ...config, default_content: e.target.value })
            }
            placeholder="HTML content..."
            disabled={saving}
            className="w-full h-40"
          />
        </div>

        <div>
          <label htmlFor="rate_limit" className="block text-sm font-medium text-gray-700 mb-2">
            Rate Limit (emails per hour)
          </label>
          <Input
            id="rate_limit"
            type="number"
            value={config.rate_limit_per_hour || 100}
            onChange={(e) =>
              setConfig({ ...config, rate_limit_per_hour: parseInt(e.target.value) })
            }
            placeholder="100"
            disabled={saving}
            min="1"
            className="w-full"
          />
        </div>

        <div className="text-sm text-gray-600">
          Last updated: {config.updated_at ? new Date(config.updated_at).toLocaleString() : 'Never'}
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
        >
          {saving ? 'Saving...' : '💾 Save Configuration'}
        </Button>
      </div>
    </Card>
  );
}
