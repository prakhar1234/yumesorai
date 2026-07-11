'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface ParsedClient {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  industry?: string;
  tags?: string[];
  notes?: string;
}

export default function BulkUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [parsedClients, setParsedClients] = useState<ParsedClient[]>([]);
  const [errors, setErrors] = useState<{ row: number; error: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    duplicates: number;
    errors: Array<{ email: string; error: string }>;
  } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsedClients([]);
    setErrors([]);
    setResult(null);

    try {
      const text = await selectedFile.text();
      const lines = text.split('\n');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const clients: ParsedClient[] = [];
      const parseErrors: { row: number; error: string }[] = [];

      // Skip header row if it exists
      const startRow = lines[0].toLowerCase().includes('email') ? 1 : 0;

      for (let i = startRow; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',').map((p) => p.trim());
        const email = parts[0];

        if (!email) {
          parseErrors.push({ row: i + 1, error: 'Email is required' });
          continue;
        }

        if (!emailRegex.test(email)) {
          parseErrors.push({ row: i + 1, error: `Invalid email: ${email}` });
          continue;
        }

        clients.push({
          email,
          name: parts[1] || undefined,
          company: parts[2] || undefined,
          phone: parts[3] || undefined,
          industry: parts[4] || undefined,
          tags: parts[5] ? parts[5].split(';').map((t) => t.trim()) : undefined,
          notes: parts[6] || undefined,
        });
      }

      setParsedClients(clients);
      setErrors(parseErrors);
    } catch (err) {
      setErrors([{ row: 0, error: 'Failed to parse CSV file' }]);
      console.error('[BulkUploadForm] Parse error:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/ops/maestro/clients/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clients: parsedClients,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors(
          data.errors || [
            {
              row: 0,
              error: data.error || 'Failed to upload clients',
            },
          ]
        );
        return;
      }

      setResult(data);
      setSubmitted(true);

      // Redirect back to clients list after success
      setTimeout(() => {
        router.push('/ops/maestro/clients');
        router.refresh();
      }, 2000);
    } catch (err) {
      setErrors([{ row: 0, error: 'An error occurred while uploading' }]);
      console.error('[BulkUploadForm] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted && result) {
    return (
      <Card className="p-6 bg-green-50 border border-green-200">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-green-900">Upload Successful!</h3>
            <p className="text-sm text-green-700 mt-1">
              Your clients have been uploaded successfully.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600">Created</p>
              <p className="text-2xl font-bold text-green-600">{result.created}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-gray-600">Duplicates Skipped</p>
              <p className="text-2xl font-bold text-yellow-600">{result.duplicates}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-red-200">
              <p className="text-sm text-gray-600">Errors</p>
              <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-white p-4 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-900 mb-2">Errors:</h4>
              <ul className="space-y-1">
                {result.errors.map((err, idx) => (
                  <li key={idx} className="text-sm text-red-700">
                    {err.email}: {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm text-gray-600">Redirecting to clients list...</p>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Errors */}
      {errors.length > 0 && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <h4 className="font-semibold text-red-900 mb-2">Errors found:</h4>
          <ul className="space-y-1">
            {errors.map((err, idx) => (
              <li key={idx} className="text-sm text-red-700">
                Row {err.row}: {err.error}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* File Upload */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload CSV File</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV File *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-input"
              />
              <label htmlFor="csv-input" className="cursor-pointer">
                <p className="text-gray-600">
                  {file ? `Selected: ${file.name}` : 'Click to select CSV file'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Format: email, name, company, phone, industry, tags, notes
                </p>
              </label>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>CSV Format:</strong> Each row should contain: email, name, company, phone, industry, tags (semicolon-separated), notes
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Example: john@example.com, John Doe, Acme Inc., 555-1234, Technology, vip;premium, Notes here
            </p>
          </div>
        </div>
      </Card>

      {/* Preview */}
      {parsedClients.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Preview ({parsedClients.length} clients)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Email</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Name</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Company</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Industry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parsedClients.slice(0, 10).map((client, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{client.email}</td>
                    <td className="px-4 py-3 text-gray-600">{client.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{client.company || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{client.industry || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {parsedClients.length > 10 && (
            <p className="text-sm text-gray-600 mt-2">
              ... and {parsedClients.length - 10} more clients
            </p>
          )}
        </Card>
      )}

      {/* Form Actions */}
      <Card className="p-4 bg-gray-50 flex gap-3 justify-end">
        <Link href="/ops/maestro/clients">
          <Button className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2">
            Cancel
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={loading || parsedClients.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 disabled:opacity-50"
        >
          {loading ? 'Uploading...' : `Upload ${parsedClients.length} Clients`}
        </Button>
      </Card>
    </form>
  );
}
