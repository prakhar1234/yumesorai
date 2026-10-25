import type { Metadata } from 'next';
import { RadClient } from '@/components/demystifier/RadClient';

export const metadata: Metadata = {
  title: 'RAD | Yumesorai',
  description: 'Rapid App Development — scaffold, preview, and deploy modern apps',
};

export default function RadPage() {
  return <RadClient />;
}
