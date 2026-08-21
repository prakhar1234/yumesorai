import type { Metadata } from 'next';
import { CodeFluxClient } from '@/components/demystifier/CodeFluxClient';

export const metadata: Metadata = {
  title: 'Code Flux | Yumesorai',
  description: 'COBOL change workflow with impact preview and approval flow',
};

export default function CodeFluxPage() {
  return <CodeFluxClient />;
}
