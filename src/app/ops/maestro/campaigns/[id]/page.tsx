/**
 * Campaign details page
 */

import { Metadata } from 'next';
import CampaignDetails from './campaign-details';

export const metadata: Metadata = {
  title: 'Campaign Details - Maestro Admin',
  description: 'View and manage campaign details',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CampaignDetailsPage() {
  return <CampaignDetails />;
}
