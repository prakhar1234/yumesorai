import type { Metadata } from 'next';
import { DemystifierClient } from '@/components/demystifier/DemystifierClient';

export const metadata: Metadata = {
  title: 'Demistifier | Yumesorai',
  description: 'COBOL knowledge graph explorer with impact analysis, path tracing, and risk heatmaps',
};

export default function DemystifierPage() {
  return <DemystifierClient />;
}
