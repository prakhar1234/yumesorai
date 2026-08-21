import type { Metadata } from 'next';
import { TransformerClient } from '@/components/demystifier/TransformerClient';

export const metadata: Metadata = {
  title: 'Transformer | Yumesorai',
  description: 'COBOL to modern language converter with parity testing',
};

export default function TransformerPage() {
  return <TransformerClient />;
}
