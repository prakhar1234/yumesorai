'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';

interface Stats {
  totalCampaigns: number;
  draftCampaigns: number;
  completedCampaigns: number;
  totalEmails: number;
}

export default function OverviewStats() {
  const [stats, setStats] = useState<Stats>({
    totalCampaigns: 0,
    draftCampaigns: 0,
    completedCampaigns: 0,
    totalEmails: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch campaigns to calculate stats
        const response = await fetch('/api/ops/maestro/campaigns?limit=1000');
        const data = await response.json();

        if (response.ok && data.campaigns) {
          const campaigns = data.campaigns;
          const draftCount = campaigns.filter((c: any) => c.status === 'draft').length;
          const completedCount = campaigns.filter((c: any) => c.status === 'completed').length;
          const totalEmails = campaigns.reduce((sum: number, c: any) => sum + (c.total_recipients || 0), 0);

          setStats({
            totalCampaigns: campaigns.length,
            draftCampaigns: draftCount,
            completedCampaigns: completedCount,
            totalEmails,
          });
        }
      } catch (err) {
        setError('Failed to load statistics');
        console.error('[OverviewStats] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6 bg-gray-100 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  const statItems = [
    {
      label: 'Total Campaigns',
      value: stats.totalCampaigns,
      icon: '📊',
      color: 'bg-blue-100',
    },
    {
      label: 'Draft Campaigns',
      value: stats.draftCampaigns,
      icon: '📝',
      color: 'bg-yellow-100',
    },
    {
      label: 'Completed Campaigns',
      value: stats.completedCampaigns,
      icon: '✅',
      color: 'bg-green-100',
    },
    {
      label: 'Total Emails Sent',
      value: stats.totalEmails,
      icon: '📧',
      color: 'bg-purple-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card key={item.label} className={`p-6 ${item.color} border-0`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{item.label}</p>
              <p className="text-3xl font-bold text-gray-900">{item.value}</p>
            </div>
            <span className="text-4xl">{item.icon}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
